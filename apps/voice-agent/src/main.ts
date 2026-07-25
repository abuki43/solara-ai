import { ServerOptions, cli, defineAgent, inference, voice } from "@livekit/agents";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import {
  createAgent,
  type AvailabilityRequest,
  type BookingCancelRequest,
  type BookingLookupRequest,
  type BookingRequest,
  type BookingRescheduleRequest,
  type HandoffRequest,
} from "./agent.ts";

dotenv.config({ path: "../../apps/server/.env" });

export const AGENT_NAME = "solar-receptionist";

type DispatchMetadata = {
  agentId: string;
  language: "en";
  callType: "test" | "public";
};

const DEFAULT_ENGLISH_VOICE_ID = "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc";

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
  };
  prompt: string;
  enabledTools: string[];
};

function resolveEnglishVoiceId(voiceConfig?: Record<string, string> | null): string {
  const configured = voiceConfig?.en?.trim();
  return configured || DEFAULT_ENGLISH_VOICE_ID;
}

function createSession(voiceId = DEFAULT_ENGLISH_VOICE_ID) {
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
      preemptiveGeneration: { enabled: true },
    },
  });
}

function parseDispatchMetadata(raw: string): DispatchMetadata {
  const value = JSON.parse(raw) as Partial<DispatchMetadata>;
  if (!value.agentId || value.language !== "en") {
    throw new Error("Invalid or unsupported dispatch metadata");
  }
  return {
    agentId: value.agentId,
    language: "en",
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

function createHandoffHandler(agentId: string, roomName: string) {
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
      return body?.message ?? "The request was delivered successfully.";
    } catch {
      return "The handoff service is temporarily unavailable. Ask the caller to contact the business directly.";
    }
  };
}

function createAvailabilityHandler(agentId: string) {
  return async (input: AvailabilityRequest): Promise<string> => {
    const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";
    const apiKey = process.env.INTERNAL_API_KEY;
    if (!apiKey) return "Availability is temporarily unavailable.";

    try {
      const query = new URLSearchParams({
        serviceName: input.serviceName,
        date: input.date,
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
      if (!response.ok) return body?.error ?? "Availability could not be checked.";
      if (!body?.slots?.length) {
        return `There are no available ${input.serviceName} appointments on ${input.date}.`;
      }
      return JSON.stringify({
        timezone: body.timezone,
        availableTimes: body.slots,
        instruction: "Offer only these times and preserve the exact startTime when booking.",
      });
    } catch {
      return "Availability is temporarily unavailable. Do not offer an unverified time.";
    }
  };
}

function createBookingHandler(agentId: string, roomName: string) {
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
          body: JSON.stringify({ ...input, roomName }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | { message?: string; error?: string; bookingId?: string; confirmationCode?: string }
        | null;
      if (!response.ok) {
        return body?.error ?? "The appointment could not be confirmed.";
      }
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

export default defineAgent({
  entry: async (ctx) => {
    let config: AgentConfig;

    try {
      const metadata = parseDispatchMetadata(ctx.job.metadata);
      config = await fetchAgentConfig(metadata.agentId);
    } catch (error) {
      console.error("Unable to load receptionist configuration", error);
      const fallbackSession = createSession();
      await fallbackSession.start({
        agent: createAgent(
          "You are a voice assistant handling a temporary service error. Apologize briefly, do not collect sensitive information, and ask the caller to try again later.",
        ),
        room: ctx.room,
      });
      await ctx.connect();
      fallbackSession.generateReply({
        instructions:
          "Tell the caller that the receptionist is temporarily unavailable and ask them to try again later.",
      });
      return;
    }

    const session = createSession(resolveEnglishVoiceId(config.agent.voiceConfig));
    const requestHandoff = config.enabledTools.includes("telegram_handoff")
      ? createHandoffHandler(config.agent.id, ctx.room.name ?? "unknown-room")
      : undefined;
    const checkAvailability = config.enabledTools.includes("booking")
      ? createAvailabilityHandler(config.agent.id)
      : undefined;
    const bookAppointment = config.enabledTools.includes("booking")
      ? createBookingHandler(config.agent.id, ctx.room.name ?? "unknown-room")
      : undefined;
    const lookupBooking = config.enabledTools.includes("booking")
      ? createBookingLookupHandler(config.agent.id)
      : undefined;
    const cancelBooking = config.enabledTools.includes("booking")
      ? createBookingCancelHandler(config.agent.id, ctx.room.name ?? "unknown-room")
      : undefined;
    const rescheduleBooking = config.enabledTools.includes("booking")
      ? createBookingRescheduleHandler(config.agent.id, ctx.room.name ?? "unknown-room")
      : undefined;
    await session.start({
      agent: createAgent(
        config.prompt,
        requestHandoff,
        checkAvailability,
        bookAppointment,
        lookupBooking,
        cancelBooking,
        rescheduleBooking,
      ),
      room: ctx.room,
    });

    await ctx.connect();

    session.generateReply({
      instructions: `Deliver this configured company greeting naturally, like a real customer support representative answering the phone, without adding another introduction: ${config.agent.greeting ?? `Thank you for calling ${config.organization.name}. You've reached our customer support. I'm an AI assistant here to help — how can I help you today?`}`,
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: AGENT_NAME,
  }),
);
