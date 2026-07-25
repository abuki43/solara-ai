import {
  DEFAULT_ENGLISH_VOICE_ID,
  isKnownEnglishVoiceId,
} from "@solar-ai/api/lib/voice-catalog";
import { auth } from "@solar-ai/auth";
import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { organizations } from "@solar-ai/db/schema/organization";
import { env } from "@solar-ai/env/server";
import { fromNodeHeaders } from "better-auth/node";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

export const voicePreviewRouter: Router = Router();

const previewSchema = z.object({
  agentId: z.string().min(1),
  voiceId: z.string().uuid(),
  text: z.string().min(1).max(200).optional(),
});

const DEFAULT_PREVIEW_TEXT =
  "Hello, thank you for calling. How can I help you today?";

voicePreviewRouter.post("/preview", async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const input = previewSchema.parse(req.body);
    if (!isKnownEnglishVoiceId(input.voiceId)) {
      res.status(400).json({ error: "Unknown English voice selection" });
      return;
    }

    const [owned] = await db
      .select({ id: agents.id })
      .from(agents)
      .innerJoin(organizations, eq(agents.organizationId, organizations.id))
      .where(and(eq(agents.id, input.agentId), eq(organizations.userId, session.user.id)))
      .limit(1);

    if (!owned) {
      res.status(404).json({ error: "Receptionist not found" });
      return;
    }

    if (!env.CARTESIA_API_KEY) {
      res.status(503).json({
        error:
          "Voice preview is unavailable. Set CARTESIA_API_KEY on the server to enable previews.",
      });
      return;
    }

    const text = input.text?.trim() || DEFAULT_PREVIEW_TEXT;
    const response = await fetch("https://api.cartesia.ai/tts/bytes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cartesia-Version": "2025-04-16",
        "X-API-Key": env.CARTESIA_API_KEY,
      },
      body: JSON.stringify({
        model_id: "sonic-3",
        transcript: text,
        voice: {
          mode: "id",
          id: input.voiceId || DEFAULT_ENGLISH_VOICE_ID,
        },
        output_format: {
          container: "mp3",
          bit_rate: 128000,
          sample_rate: 44100,
        },
        language: "en",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("Cartesia preview failed", response.status, detail);
      res.status(502).json({ error: "Unable to synthesize voice preview" });
      return;
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(audio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid preview request" });
      return;
    }
    console.error("Voice preview failed", error);
    res.status(500).json({ error: "Voice preview failed" });
  }
});
