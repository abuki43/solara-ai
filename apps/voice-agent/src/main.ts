import { ServerOptions, cli, defineAgent, inference, voice } from "@livekit/agents";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createAgent } from "./agent.ts";

dotenv.config({ path: "../../apps/server/.env" });

export const AGENT_NAME = "solar-receptionist";

type DispatchMetadata = {
  agentId: string;
  language: "en";
  callType: "test" | "public";
};

type AgentConfig = {
  agent: {
    id: string;
    name: string;
    greeting: string | null;
    primaryLanguage: "en" | "am" | "om";
  };
  organization: {
    name: string;
  };
  prompt: string;
};

function createSession() {
  return new voice.AgentSession({
    stt: new inference.STT({
      model: "deepgram/nova-3",
      language: "en",
    }),
    tts: new inference.TTS({
      model: "cartesia/sonic-3",
      voice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
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

    const session = createSession();
    await session.start({
      agent: createAgent(config.prompt),
      room: ctx.room,
    });

    await ctx.connect();

    session.generateReply({
      instructions: `Greet the caller warmly for ${config.organization.name}. Clearly disclose that you are an AI assistant. Use this configured greeting as the basis: ${config.agent.greeting ?? "Hello, how can I help you today?"}`,
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: AGENT_NAME,
  }),
);
