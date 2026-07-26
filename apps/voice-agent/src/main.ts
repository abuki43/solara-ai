import { ServerOptions, cli, defineAgent, inference, voice, type JobContext } from "@livekit/agents";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import {
  createAgent,
  type AvailabilityRequest,
  type BookingCancelRequest,
  type BookingLookupRequest,
  type BookingRequest,
  type BookingRescheduleRequest,
  type EndCallRequest,
  type HandoffRequest,
} from "./agent.ts";
import { isAddisAmharicRuntimeEnabled } from "./addis/client.ts";
import { AddisSTT } from "./addis/stt.ts";
import { AddisTTS } from "./addis/tts.ts";
import { normalizeServiceName, resolveBookingDate } from "./booking-input.ts";

dotenv.config({ path: "../../apps/server/.env" });

export const AGENT_NAME = "solar-receptionist";

type CallLanguage = "en" | "am";

type DispatchMetadata = {
  agentId: string;
  language: CallLanguage;
  callType: "test" | "public";
};

const DEFAULT_ENGLISH_VOICE_ID = "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc";
const DEFAULT_AMHARIC_VOICE_ID = "am-hamen";

type AgentConfig = {
  agent: {
    id: string;
    name: string;
    greeting: string | null;
    primaryLanguage: "en" | "am" | "om";
    voiceConfig?: Record<string, string> | null;
  };
  organization: {
    name: string;
    timezone: string;
  };
  prompt: string;
  enabledTools: string[];
};

function resolveEnglishVoiceId(voiceConfig?: Record<string, string> | null): string {
  const configured = voiceConfig?.en?.trim();
  return configured || DEFAULT_ENGLISH_VOICE_ID;
}

function resolveAmharicVoiceId(voiceConfig?: Record<string, string> | null): string {
  const configured = voiceConfig?.am?.trim();
  return configured || DEFAULT_AMHARIC_VOICE_ID;
}

function sanitizeGreetingText(text: string): string {
  return text
    .replace(/\s*I'm an AI assistant here to help\.?\s*/gi, " ")
    .replace(/\s*I'm an AI assistant[—–-]?\s*/gi, " ")
    .replace(/\s*I am an AI assistant\.?\s*/gi, " ")
    .replace(/\s*I am the AI assistant for your business\.?\s*/gi, " ")
    .replace(/\s*I am [^.]+\'s AI assistant\.?\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function containsGeezScript(text: string): boolean {
  return /[\u1200-\u137F]/.test(text);
}

function resolveGreetingText(
  greeting: string | null | undefined,
  organizationName: string,
  bookingEnabled: boolean,
  language: CallLanguage = "en",
): string {
  if (language === "am") {
    const configured = greeting?.trim();
    if (configured && containsGeezScript(configured)) {
      return sanitizeGreetingText(configured);
    }
    const closing = bookingEnabled
      ? "ቀጠሮ ማስያዝ ይፈልጋሉ ወይስ ጥያቄ አለዎት?"
      : "እንዴት ልረዳዎት?";
    return `ሰላም፣ እንኳን ወደ ${organizationName} በደህና መጡ። የደንበኛ አገልግሎት ነኝ። ${closing}`;
  }

  const bookingClosing =
    "Would you like to book an appointment, or do you have a question?";
  const defaultClosing = bookingEnabled
    ? bookingClosing
    : "How can I help you today?";

  const configured = greeting?.trim();
  if (configured) {
    let resolved = sanitizeGreetingText(configured);
    if (bookingEnabled) {
      resolved = resolved
        .replace(/\bhow can i help you today\??/i, bookingClosing)
        .replace(/\bhow can i help\??/i, bookingClosing);
    }
    return resolved;
  }

  return `Thank you for calling ${organizationName}. You've reached our customer support. ${defaultClosing}`;
}

function languagePromptSuffix(language: CallLanguage): string {
  if (language !== "am") return "";
  return `

Language rules:
- You MUST speak only Amharic using Ge'ez script for the entire call unless the caller clearly switches to English.
- Do not answer in English when the caller speaks Amharic.
- Keep replies short and natural for phone conversation.
- When using tools, keep tool arguments in the expected formats (service names, ISO times, phone numbers).

Call closing:
- After helping, ask if there is anything else you can help with.
- If the caller is done, say a brief goodbye and call end_call after they confirm.`;
}

function createSession(language: CallLanguage = "en", voiceId = DEFAULT_ENGLISH_VOICE_ID) {
  if (language === "am") {
    if (!isAddisAmharicRuntimeEnabled()) {
      throw new Error("Amharic calls require ADDIS_API_KEY and ADDIS_AMHARIC_ENABLED=true");
    }
    return new voice.AgentSession({
      stt: new AddisSTT("am"),
      tts: new AddisTTS(voiceId),
      // Multilingual TurnDetector has no Amharic thresholds; batch Addis STT works better with VAD.
      turnHandling: {
        turnDetection: "vad",
        preemptiveGeneration: { enabled: false },
      },
      // Addis TTS is non-streaming and can exceed the default 10s idle timeout.
      ttsReadIdleTimeout: 45_000,
      forwardAudioIdleTimeout: 45_000,
    });
  }

  return new voice.AgentSession({
    stt: new inference.STT({
      model: "deepgram/nova-3",
      language: "en",
    }),
    tts: new inference.TTS({
      model: "cartesia/sonic-3",
      voice: voiceId,
    }),
    turnHandling: {
      turnDetection: new inference.TurnDetector(),
      preemptiveGeneration: { enabled: true, preemptiveTts: true },
    },
  });
}

function parseDispatchMetadata(raw: string): DispatchMetadata {
  const value = JSON.parse(raw) as Partial<DispatchMetadata>;
  if (!value.agentId) {
    throw new Error("Invalid dispatch metadata");
  }
  const language: CallLanguage = value.language === "am" ? "am" : "en";
  if (language === "am" && !isAddisAmharicRuntimeEnabled()) {
    throw new Error("Amharic is not enabled on this voice agent");
  }
  return {
    agentId: value.agentId,
    language,
    callType: value.callType === "public" ? "public" : "test",
  };
}

async function fetchAgentConfig(agentId: string): Promise<AgentConfig> {
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";
  const apiKey = process.env.INTERNAL_API_KEY;
  if (!apiKey) throw new Error("INTERNAL_API_KEY is not configured");

  const response = await fetch(`${apiUrl}/api/internal/agent/${encodeURIComponent(agentId)}`, {
    headers: { "X-Internal-Key": apiKey },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Agent config request failed with status ${response.status}`);
  }

  return (await response.json()) as AgentConfig;
}

async function postCallLog(input: {
  roomName: string;
  language?: "en" | "am" | "om";
  startedAt: Date;
  toolsUsed: string[];
  failed?: boolean;
}) {
  const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";
  const apiKey = process.env.INTERNAL_API_KEY;
  if (!apiKey || !input.roomName.startsWith("call-")) return;

  try {
    await fetch(`${apiUrl}/api/internal/call-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": apiKey,
      },
      body: JSON.stringify({
        roomName: input.roomName,
        language: input.language ?? "en",
        startedAt: input.startedAt.toISOString(),
        endedAt: new Date().toISOString(),
        toolsUsed: input.toolsUsed,
        failed: input.failed,
      }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    console.warn("Failed to persist call log", error);
  }
}

function createHandoffHandler(
  agentId: string,
  roomName: string,
  onSuccess?: () => void,
) {
  return async (input: HandoffRequest): Promise<string> => {
    const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) {
      return "The handoff service is unavailable. Ask the caller to contact the business directly.";
    }

    try {
      const response = await fetch(
        `${apiUrl}/api/internal/agent/${encodeURIComponent(agentId)}/handoff`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Key": apiKey,
          },
          body: JSON.stringify({ ...input, roomName }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      if (!response.ok) {
        return (
          body?.error ??
          "The handoff could not be delivered. Ask the caller to contact the business directly."
        );
      }
      onSuccess?.();
      return body?.message ?? "The request was delivered successfully.";
    } catch {
      return "The handoff service is temporarily unavailable. Ask the caller to contact the business directly.";
    }
  };
}

function createAvailabilityHandler(
  agentId: string,
  timezone: string,
  onSuccess?: () => void,
) {
  return async (input: AvailabilityRequest): Promise<string> => {
    const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) return "Availability is temporarily unavailable.";

    const serviceName = normalizeServiceName(input.serviceName);
    const resolvedDate = resolveBookingDate(input.date, timezone);
    console.info("[check_availability]", {
      agentId,
      serviceName,
      rawDate: input.date,
      resolvedDate,
      timezone,
    });

    if (!resolvedDate) {
      return `Could not understand the date "${input.date}". Ask for a specific day or use today, tomorrow, or a weekday name.`;
    }

    try {
      const query = new URLSearchParams({
        serviceName,
        date: resolvedDate,
      });
      const response = await fetch(
        `${apiUrl}/api/internal/agent/${encodeURIComponent(agentId)}/availability?${query}`,
        {
          headers: { "X-Internal-Key": apiKey },
          signal: AbortSignal.timeout(10_000),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | {
            error?: string;
            timezone?: string;
            slots?: Array<{ startTime: string; localTime: string }>;
          }
        | null;
      if (!response.ok) {
        console.warn("[check_availability] failed", {
          status: response.status,
          error: body?.error,
          serviceName,
          resolvedDate,
        });
        return body?.error ?? "Availability could not be checked.";
      }
      onSuccess?.();
      if (!body?.slots?.length) {
        return `No ${serviceName} appointments are available on ${resolvedDate}. The business may be closed that day or all slots are booked. Ask if they would like another day and call check_availability again.`;
      }
      console.info("[check_availability] success", {
        serviceName,
        resolvedDate,
        slotCount: body.slots.length,
      });
      return JSON.stringify({
        timezone: body.timezone,
        date: resolvedDate,
        availableTimes: body.slots,
        instruction: "Offer only these times and preserve the exact startTime when booking.",
      });
    } catch (error) {
      console.warn("[check_availability] error", error);
      return "Availability is temporarily unavailable. Do not offer an unverified time.";
    }
  };
}

function createBookingHandler(
  agentId: string,
  roomName: string,
  onSuccess?: () => void,
) {
  return async (input: BookingRequest): Promise<string> => {
    const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) return "Booking is temporarily unavailable.";

    try {
      const response = await fetch(
        `${apiUrl}/api/internal/agent/${encodeURIComponent(agentId)}/booking`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Key": apiKey,
          },
          body: JSON.stringify({
            ...input,
            serviceName: normalizeServiceName(input.serviceName),
            roomName,
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | { message?: string; error?: string; bookingId?: string; confirmationCode?: string }
        | null;
      if (!response.ok) {
        return body?.error ?? "The appointment could not be confirmed.";
      }
      onSuccess?.();
      return `${body?.message ?? "The appointment is confirmed."} Confirmation code: ${body?.confirmationCode ?? body?.bookingId}.`;
    } catch {
      return "Booking is temporarily unavailable. Do not tell the caller the appointment is confirmed.";
    }
  };
}

function createBookingLookupHandler(agentId: string) {
  return async (input: BookingLookupRequest): Promise<string> => {
    const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) return "Booking lookup is temporarily unavailable.";
    try {
      const response = await fetch(
        `${apiUrl}/api/internal/agent/${encodeURIComponent(agentId)}/booking/lookup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Internal-Key": apiKey },
          body: JSON.stringify(input),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) return String(body?.error ?? "The booking could not be verified.");
      return JSON.stringify(body);
    } catch {
      return "Booking lookup is temporarily unavailable.";
    }
  };
}

function createBookingCancelHandler(agentId: string, roomName: string) {
  return async (input: BookingCancelRequest): Promise<string> => {
    const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) return "Cancellation is temporarily unavailable.";
    try {
      const response = await fetch(
        `${apiUrl}/api/internal/agent/${encodeURIComponent(agentId)}/booking/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Internal-Key": apiKey },
          body: JSON.stringify({ ...input, roomName }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;
      return response.ok
        ? (body?.message ?? "The booking was cancelled.")
        : (body?.error ?? "The booking could not be cancelled.");
    } catch {
      return "Cancellation is temporarily unavailable. Do not say it was cancelled.";
    }
  };
}

function createBookingRescheduleHandler(agentId: string, roomName: string) {
  return async (input: BookingRescheduleRequest): Promise<string> => {
    const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) return "Rescheduling is temporarily unavailable.";
    try {
      const response = await fetch(
        `${apiUrl}/api/internal/agent/${encodeURIComponent(agentId)}/booking/reschedule`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Internal-Key": apiKey },
          body: JSON.stringify({ ...input, roomName }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;
      return response.ok
        ? (body?.message ?? "The booking was rescheduled.")
        : (body?.error ?? "The booking could not be rescheduled.");
    } catch {
      return "Rescheduling is temporarily unavailable. Do not say it was changed.";
    }
  };
}

function createEndCallHandler(
  ctx: JobContext,
  roomName: string,
  onSuccess?: () => void,
) {
  return async (input: EndCallRequest): Promise<string> => {
    if (!input.confirmed) {
      return "The caller has not confirmed they are finished. Ask if there is anything else you can help with.";
    }

    onSuccess?.();
    console.info("[end_call]", { roomName });

    setTimeout(() => {
      void ctx
        .deleteRoom(roomName)
        .catch((error) => {
          console.warn("[end_call] deleteRoom failed, shutting down job", error);
          ctx.shutdown("call ended");
        });
    }, 2_500);

    return "The call will end shortly. Give a brief warm goodbye now and do not ask further questions.";
  };
}

export default defineAgent({
  entry: async (ctx) => {
    let config: AgentConfig;
    let language: CallLanguage = "en";

    try {
      const metadata = parseDispatchMetadata(ctx.job.metadata);
      language = metadata.language;
      config = await fetchAgentConfig(metadata.agentId);
    } catch (error) {
      console.error("Unable to load receptionist configuration", error);
      const fallbackSession = createSession("en");
      await fallbackSession.start({
        agent: createAgent(
          "You are a voice assistant handling a temporary service error. Apologize briefly, do not collect sensitive information, and ask the caller to try again later.",
        ),
        room: ctx.room,
      });
      await ctx.connect();
      fallbackSession.say(
        "Sorry, our receptionist is temporarily unavailable. Please try again in a few minutes.",
        { addToChatCtx: true, allowInterruptions: true },
      );
      return;
    }

    const startedAt = new Date();
    const roomName = ctx.room.name ?? "unknown-room";
    const toolsUsed: string[] = [];
    const trackTool = (tool: string) => {
      if (!toolsUsed.includes(tool)) toolsUsed.push(tool);
    };

    ctx.addShutdownCallback(async () => {
      await postCallLog({
        roomName,
        language,
        startedAt,
        toolsUsed,
      });
    });

    const voiceId =
      language === "am"
        ? resolveAmharicVoiceId(config.agent.voiceConfig)
        : resolveEnglishVoiceId(config.agent.voiceConfig);
    const session = createSession(language, voiceId);
    const requestHandoff = config.enabledTools.includes("telegram_handoff")
      ? createHandoffHandler(config.agent.id, roomName, () => trackTool("handoff"))
      : undefined;
    const checkAvailability = config.enabledTools.includes("booking")
      ? createAvailabilityHandler(config.agent.id, config.organization.timezone, () =>
          trackTool("availability"),
        )
      : undefined;
    const bookAppointment = config.enabledTools.includes("booking")
      ? createBookingHandler(config.agent.id, roomName, () => trackTool("booking"))
      : undefined;
    const lookupBooking = config.enabledTools.includes("booking")
      ? createBookingLookupHandler(config.agent.id)
      : undefined;
    const cancelBooking = config.enabledTools.includes("booking")
      ? createBookingCancelHandler(config.agent.id, roomName)
      : undefined;
    const rescheduleBooking = config.enabledTools.includes("booking")
      ? createBookingRescheduleHandler(config.agent.id, roomName)
      : undefined;
    const endCall = createEndCallHandler(ctx, roomName, () => trackTool("end_call"));
    const bookingEnabled = config.enabledTools.includes("booking");
    await session.start({
      agent: createAgent(
        `${config.prompt}${languagePromptSuffix(language)}`,
        requestHandoff,
        checkAvailability,
        bookAppointment,
        lookupBooking,
        cancelBooking,
        rescheduleBooking,
        endCall,
        { language },
      ),
      room: ctx.room,
    });

    await ctx.connect();

    session.say(
      resolveGreetingText(
        config.agent.greeting,
        config.organization.name,
        bookingEnabled,
        language,
      ),
      {
        addToChatCtx: true,
        allowInterruptions: true,
      },
    );
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: AGENT_NAME,
  }),
);
