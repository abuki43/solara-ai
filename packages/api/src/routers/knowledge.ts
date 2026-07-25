import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { agentFaqs } from "@solar-ai/db/schema/faq";
import { agentFiles } from "@solar-ai/db/schema/agent-file";
import { organizations } from "@solar-ai/db/schema/organization";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { buildAgentPrompt } from "../lib/agent-prompt";
import { buildFileContext } from "../lib/file-context";
import { loadOwnedAgent } from "../lib/load-owned-agent";
import {
  businessHoursSchema,
  servicesSchema,
} from "../lib/knowledge-validation";
import { orgOwnerProcedure } from "../lib/org-procedure";
import { router } from "../index";

async function loadKnowledgeBundle(organizationId: string, agentId: string) {
  const { agent, organization } = await loadOwnedAgent(organizationId, agentId);
  const [faqs, files] = await Promise.all([
    db
      .select()
      .from(agentFaqs)
      .where(eq(agentFaqs.agentId, agentId))
      .orderBy(asc(agentFaqs.sortOrder), asc(agentFaqs.createdAt)),
    db
      .select()
      .from(agentFiles)
      .where(eq(agentFiles.agentId, agentId))
      .orderBy(asc(agentFiles.createdAt)),
  ]);

  const fileContext = buildFileContext(files);
  const promptPreview = buildAgentPrompt({
    agent,
    organization,
    faqs: faqs.map((faq) => ({ question: faq.question, answer: faq.answer })),
    fileContext,
  });

  return { agent, organization, faqs, files, promptPreview };
}

export const knowledgeRouter = router({
  get: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => loadKnowledgeBundle(ctx.organization.id, input.agentId)),

  updateBusiness: orgOwnerProcedure
    .input(
      z.object({
        agentId: z.string().min(1),
        businessName: z.string().min(1).max(100),
        phone: z.string().max(20).nullable().optional(),
        address: z.string().max(200).nullable().optional(),
        website: z
          .union([z.string().url().max(300), z.literal(""), z.null()])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { agent } = await loadOwnedAgent(ctx.organization.id, input.agentId);
      const website =
        input.website === undefined
          ? undefined
          : input.website === "" || input.website === null
            ? null
            : input.website;

      await db.transaction(async (tx) => {
        await tx
          .update(agents)
          .set({ businessName: input.businessName })
          .where(eq(agents.id, agent.id));

        await tx
          .update(organizations)
          .set({
            ...(input.phone !== undefined ? { phone: input.phone } : {}),
            ...(input.address !== undefined ? { address: input.address } : {}),
            ...(website !== undefined ? { website } : {}),
          })
          .where(eq(organizations.id, ctx.organization.id));
      });

      return loadKnowledgeBundle(ctx.organization.id, input.agentId);
    }),

  updateHours: orgOwnerProcedure
    .input(
      z.object({
        agentId: z.string().min(1),
        hours: businessHoursSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { agent } = await loadOwnedAgent(ctx.organization.id, input.agentId);
      await db
        .update(agents)
        .set({ hours: input.hours })
        .where(eq(agents.id, agent.id));
      return loadKnowledgeBundle(ctx.organization.id, input.agentId);
    }),

  updateServices: orgOwnerProcedure
    .input(
      z.object({
        agentId: z.string().min(1),
        services: servicesSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { agent } = await loadOwnedAgent(ctx.organization.id, input.agentId);
      await db
        .update(agents)
        .set({ services: input.services })
        .where(eq(agents.id, agent.id));
      return loadKnowledgeBundle(ctx.organization.id, input.agentId);
    }),

  updateAbout: orgOwnerProcedure
    .input(
      z.object({
        agentId: z.string().min(1),
        aboutText: z.string().max(4000).nullable(),
        customInstructions: z.string().max(2000).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { agent } = await loadOwnedAgent(ctx.organization.id, input.agentId);
      await db
        .update(agents)
        .set({
          aboutText: input.aboutText,
          customInstructions: input.customInstructions,
        })
        .where(eq(agents.id, agent.id));
      return loadKnowledgeBundle(ctx.organization.id, input.agentId);
    }),
});
