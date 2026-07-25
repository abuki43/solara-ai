import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { agentTools } from "@solar-ai/db/schema/telegram";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { isAddisAmharicEnabled } from "../lib/addis";
import { buildDefaultGreeting } from "../lib/agent-templates";
import { loadOwnedAgent } from "../lib/load-owned-agent";
import { orgOwnerProcedure } from "../lib/org-procedure";
import {
  AMHARIC_VOICES,
  DEFAULT_ENGLISH_VOICE_ID,
  ENGLISH_VOICES,
  isKnownAmharicVoiceId,
  isKnownEnglishVoiceId,
  resolveAmharicVoiceId,
  resolveEnglishVoiceId,
} from "../lib/voice-catalog";
import { router } from "../index";

const toneSchema = z.enum(["friendly", "professional", "casual"]);

export const voiceRouter = router({
  get: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { agent } = await loadOwnedAgent(ctx.organization.id, input.agentId);
      const [tools] = await db
        .select({ bookingEnabled: agentTools.bookingEnabled })
        .from(agentTools)
        .where(eq(agentTools.agentId, agent.id))
        .limit(1);
      const amharicEnabled = isAddisAmharicEnabled();
      return {
        agentId: agent.id,
        name: agent.name,
        primaryLanguage: agent.primaryLanguage,
        additionalLanguages: agent.additionalLanguages,
        greeting: agent.greeting,
        tone: agent.tone,
        voiceConfig: agent.voiceConfig,
        selectedVoiceId: resolveEnglishVoiceId(agent.voiceConfig),
        selectedAmharicVoiceId: resolveAmharicVoiceId(agent.voiceConfig),
        voices: ENGLISH_VOICES,
        amharicVoices: amharicEnabled ? AMHARIC_VOICES : [],
        amharicEnabled,
        defaultGreeting: buildDefaultGreeting(
          agent.businessName || ctx.organization.name,
          tools?.bookingEnabled ?? false,
        ),
      };
    }),

  update: orgOwnerProcedure
    .input(
      z.object({
        agentId: z.string().min(1),
        greeting: z.string().min(1).max(500),
        tone: toneSchema,
        englishVoiceId: z.string().min(1).optional(),
        amharicVoiceId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.englishVoiceId && !isKnownEnglishVoiceId(input.englishVoiceId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown English voice selection",
        });
      }
      if (input.amharicVoiceId) {
        if (!isAddisAmharicEnabled()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Amharic voices are not enabled on this server",
          });
        }
        if (!isKnownAmharicVoiceId(input.amharicVoiceId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unknown Amharic voice selection",
          });
        }
      }

      const { agent } = await loadOwnedAgent(ctx.organization.id, input.agentId);
      const voiceConfig = {
        ...agent.voiceConfig,
        en: input.englishVoiceId || agent.voiceConfig?.en || DEFAULT_ENGLISH_VOICE_ID,
        ...(input.amharicVoiceId
          ? { am: input.amharicVoiceId }
          : agent.voiceConfig?.am
            ? { am: agent.voiceConfig.am }
            : {}),
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
