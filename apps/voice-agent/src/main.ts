import { ServerOptions, cli, defineAgent, inference, voice } from "@livekit/agents";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createAgent } from "./agent.ts";

dotenv.config({ path: "../../apps/server/.env" });

export const AGENT_NAME = "solar-receptionist";

export default defineAgent({
  entry: async (ctx) => {
    const session = new voice.AgentSession({
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

    await session.start({
      agent: createAgent(),
      room: ctx.room,
    });

    await ctx.connect();

    session.generateReply({
      instructions:
        "Greet the caller warmly as Bella Salon receptionist. Introduce yourself and ask how you can help today.",
    });
  },
});

cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: AGENT_NAME,
  }),
);
