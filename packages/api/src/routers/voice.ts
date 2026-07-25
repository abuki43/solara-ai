import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { buildDefaultGreeting } from "../lib/agent-templates";
import { loadOwnedAgent } from "../lib/load-owned-agent";
import { orgOwnerProcedure } from "../lib/org-procedure";
import {
  ENGLISH_VOICES,
  DEFAULT_ENGLISH_VOICE_ID,
  isKnownEnglishVoiceId,
  resolveEnglishVoiceId,
} from "../lib/voice-catalog";
import { router } from "../index";

const toneSchema = z.enum(["friendly", "professional", "casual"]);

export const voiceRouter = router({
  get: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { agent } = await loadOwnedAgent(ctx.organization.id, input.agentId);
      return {
        agentId: agent.id,
        name: agent.name,
        primaryLanguage: agent.primaryLanguage,
        additionalLanguages: agent.additionalLanguages,
        greeting: agent.greeting,
        tone: agent.tone,
        voiceConfig: agent.voiceConfig,
        selectedVoiceId: resolveEnglishVoiceId(agent.voiceConfig),
        voices: ENGLISH_VOICES,
        defaultGreeting: buildDefaultGreeting(agent.businessName || ctx.organization.name),
      };
    }),

  update: orgOwnerProcedure
    .input(
      z.object({
        agentId: z.string().min(1),
        greeting: z.string().min(1).max(500),
        tone: toneSchema,
        englishVoiceId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isKnownEnglishVoiceId(input.englishVoiceId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown English voice selection",
        });
      }

      const { agent } = await loadOwnedAgent(ctx.organization.id, input.agentId);
      const voiceConfig = {
        ...agent.voiceConfig,
        en: input.englishVoiceId || DEFAULT_ENGLISH_VOICE_ID,
      };

      const [updated] = await db
        .update(agents)
        .set({
          greeting: input.greeting,
          tone: input.tone,
          voiceConfig,
        })
        .where(eq(agents.id, agent.id))
        .returning();

      return updated;
    }),
});
