import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { slugify, USE_CASE_TEMPLATES } from "../lib/agent-templates";
import { orgOwnerProcedure } from "../lib/org-procedure";
import { router } from "../index";

const languageSchema = z.enum(["en", "am", "om"]);
const useCaseSchema = z.enum(["salon", "clinic", "restaurant", "general"]);

const createAgentSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
  useCase: useCaseSchema,
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens"),
  primaryLanguage: languageSchema,
  additionalLanguages: z.array(languageSchema).default([]),
});

const updateAgentSchema = createAgentSchema.partial().extend({
  id: z.string().min(1),
});

async function assertUniqueSlug(organizationId: string, slug: string, excludeId?: string) {
  const [existing] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(and(eq(agents.organizationId, organizationId), eq(agents.slug, slug)))
    .limit(1);

  if (existing && existing.id !== excludeId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "An agent with this URL slug already exists",
    });
  }
}

export const agentRouter = router({
  list: orgOwnerProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(agents)
      .where(eq(agents.organizationId, ctx.organization.id))
      .orderBy(desc(agents.createdAt));
  }),

  get: orgOwnerProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, input.id), eq(agents.organizationId, ctx.organization.id)))
        .limit(1);

      if (!agent) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      return agent;
    }),

  create: orgOwnerProcedure.input(createAgentSchema).mutation(async ({ ctx, input }) => {
    await assertUniqueSlug(ctx.organization.id, input.slug);

    const additionalLanguages = input.additionalLanguages.filter(
      (lang) => lang !== input.primaryLanguage,
    );

    const template = USE_CASE_TEMPLATES[input.useCase];
    const businessName = ctx.organization.name;

    const [created] = await db
      .insert(agents)
      .values({
        id: crypto.randomUUID(),
        organizationId: ctx.organization.id,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        useCase: input.useCase,
        status: "draft",
        primaryLanguage: input.primaryLanguage,
        additionalLanguages,
        voiceConfig: {},
        businessName,
        hours: template.hours,
        services: template.services,
        greeting: template.greeting(businessName),
      })
      .returning();

    return created;
  }),

  update: orgOwnerProcedure.input(updateAgentSchema).mutation(async ({ ctx, input }) => {
    const { id, ...updates } = input;

    const [existing] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.organizationId, ctx.organization.id)))
      .limit(1);

    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
    }

    if (updates.slug) {
      await assertUniqueSlug(ctx.organization.id, updates.slug, id);
    }

    let additionalLanguages = updates.additionalLanguages;
    const primaryLanguage = updates.primaryLanguage ?? existing.primaryLanguage;
    if (additionalLanguages) {
      additionalLanguages = additionalLanguages.filter((lang) => lang !== primaryLanguage);
    }

    const [updated] = await db
      .update(agents)
      .set({
        ...updates,
        ...(additionalLanguages ? { additionalLanguages } : {}),
      })
      .where(eq(agents.id, id))
      .returning();

    return updated;
  }),

  delete: orgOwnerProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, input.id), eq(agents.organizationId, ctx.organization.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      await db.delete(agents).where(eq(agents.id, input.id));
      return { success: true };
    }),

  suggestSlug: orgOwnerProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(({ input }) => {
      const base = slugify(input.name) || "agent";
      return base;
    }),
});

export { slugify };
