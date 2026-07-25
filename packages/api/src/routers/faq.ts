import { db } from "@solar-ai/db";
import { agentFaqs } from "@solar-ai/db/schema/faq";
import { TRPCError } from "@trpc/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { loadOwnedAgent } from "../lib/load-owned-agent";
import { orgOwnerProcedure } from "../lib/org-procedure";
import { router } from "../index";

const MAX_FAQS = 20;

const faqFields = {
  question: z.string().min(1).max(500),
  answer: z.string().min(1).max(1000),
};

async function countFaqs(agentId: string) {
  const rows = await db
    .select({ id: agentFaqs.id })
    .from(agentFaqs)
    .where(eq(agentFaqs.agentId, agentId));
  return rows.length;
}

export const faqRouter = router({
  list: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await loadOwnedAgent(ctx.organization.id, input.agentId);
      return db
        .select()
        .from(agentFaqs)
        .where(eq(agentFaqs.agentId, input.agentId))
        .orderBy(asc(agentFaqs.sortOrder), asc(agentFaqs.createdAt));
    }),

  create: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1), ...faqFields }))
    .mutation(async ({ ctx, input }) => {
      await loadOwnedAgent(ctx.organization.id, input.agentId);
      if ((await countFaqs(input.agentId)) >= MAX_FAQS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum of ${MAX_FAQS} FAQs per receptionist`,
        });
      }

      const existing = await db
        .select({ sortOrder: agentFaqs.sortOrder })
        .from(agentFaqs)
        .where(eq(agentFaqs.agentId, input.agentId))
        .orderBy(asc(agentFaqs.sortOrder));
      const nextOrder = (existing.at(-1)?.sortOrder ?? -1) + 1;

      const [created] = await db
        .insert(agentFaqs)
        .values({
          id: crypto.randomUUID(),
          agentId: input.agentId,
          question: input.question,
          answer: input.answer,
          sortOrder: nextOrder,
        })
        .returning();

      return created;
    }),

  update: orgOwnerProcedure
    .input(
      z.object({
        faqId: z.string().min(1),
        agentId: z.string().min(1),
        ...faqFields,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await loadOwnedAgent(ctx.organization.id, input.agentId);
      const [updated] = await db
        .update(agentFaqs)
        .set({
          question: input.question,
          answer: input.answer,
        })
        .where(and(eq(agentFaqs.id, input.faqId), eq(agentFaqs.agentId, input.agentId)))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found" });
      }
      return updated;
    }),

  delete: orgOwnerProcedure
    .input(z.object({ faqId: z.string().min(1), agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await loadOwnedAgent(ctx.organization.id, input.agentId);
      const deleted = await db
        .delete(agentFaqs)
        .where(and(eq(agentFaqs.id, input.faqId), eq(agentFaqs.agentId, input.agentId)))
        .returning({ id: agentFaqs.id });

      if (!deleted.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found" });
      }
      return { success: true };
    }),

  reorder: orgOwnerProcedure
    .input(
      z.object({
        agentId: z.string().min(1),
        orderedIds: z.array(z.string().min(1)).max(MAX_FAQS),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await loadOwnedAgent(ctx.organization.id, input.agentId);
      const existing = await db
        .select({ id: agentFaqs.id })
        .from(agentFaqs)
        .where(eq(agentFaqs.agentId, input.agentId));

      const existingIds = new Set(existing.map((row) => row.id));
      if (
        input.orderedIds.length !== existingIds.size ||
        input.orderedIds.some((id) => !existingIds.has(id))
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "orderedIds must include every FAQ for this receptionist exactly once",
        });
      }

      await db.transaction(async (tx) => {
        for (const [index, id] of input.orderedIds.entries()) {
          await tx
            .update(agentFaqs)
            .set({ sortOrder: index })
            .where(and(eq(agentFaqs.id, id), eq(agentFaqs.agentId, input.agentId)));
        }
      });

      return db
        .select()
        .from(agentFaqs)
        .where(
          and(eq(agentFaqs.agentId, input.agentId), inArray(agentFaqs.id, input.orderedIds)),
        )
        .orderBy(asc(agentFaqs.sortOrder));
    }),
});
