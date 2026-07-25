import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { organizations } from "@solar-ai/db/schema/organization";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { slugify, USE_CASE_TEMPLATES } from "../lib/agent-templates";
import { orgOwnerProcedure } from "../lib/org-procedure";
import { publicProcedure, router } from "../index";

const languageSchema = z.enum(["en", "am", "om"]);
const useCaseSchema = z.enum(["salon", "clinic", "restaurant", "general"]);
const toneSchema = z.enum(["friendly", "professional", "casual"]);
const businessHoursSchema = z.record(
  z.string(),
  z.object({
    open: z.string().nullable(),
    close: z.string().nullable(),
    closed: z.boolean(),
  }),
);
const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  price: z.number().nonnegative(),
  currency: z.string().min(1).max(10),
  durationMinutes: z.number().int().min(15).max(480).multipleOf(15),
  bookable: z.boolean(),
});

const createAgentSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
  useCase: useCaseSchema,
});

const updateAgentSchema = createAgentSchema
  .partial()
  .extend({
    id: z.string().min(1),
    primaryLanguage: languageSchema.optional(),
    additionalLanguages: z.array(languageSchema).optional(),
    greeting: z.string().min(1).max(500).optional(),
    hours: businessHoursSchema.optional(),
    services: z.array(serviceSchema).max(20).optional(),
    tone: toneSchema.optional(),
    aboutText: z.string().max(4000).nullable().optional(),
    customInstructions: z.string().max(2000).nullable().optional(),
    widgetButtonLabel: z.string().min(1).max(40).optional(),
    widgetAccentColor: z
      .string()
      .regex(/^#([0-9a-fA-F]{6})$/, "Use a hex color like #7cf0ff")
      .optional(),
  });

async function assertUniqueSlug(slug: string, excludeId?: string) {
  const [existing] = await db
    .select({ id: agents.id })
    .from(agents)
    .where(eq(agents.slug, slug))
    .limit(1);

  if (existing && existing.id !== excludeId) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "An agent with this URL slug already exists",
    });
  }
}

async function generateAgentIdentity(businessName: string) {
  const base = (slugify(businessName) || "business").slice(0, 31);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const id = crypto.randomUUID();
    const suffix = id.replaceAll("-", "").slice(0, 8);
    const slug = `${base}-${suffix}`;
    const [existing] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.slug, slug))
      .limit(1);

    if (!existing) return { id, slug };
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Could not generate a unique public call URL",
  });
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
    const template = USE_CASE_TEMPLATES[input.useCase];
    const businessName = ctx.organization.name;
    const identity = await generateAgentIdentity(businessName);

    const [created] = await db
      .insert(agents)
      .values({
        id: identity.id,
        organizationId: ctx.organization.id,
        name: input.name,
        slug: identity.slug,
        description: input.description ?? null,
        useCase: input.useCase,
        status: "draft",
        primaryLanguage: "en",
        additionalLanguages: [],
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

  updateStatus: orgOwnerProcedure
    .input(
      z.object({
        id: z.string().min(1),
        status: z.enum(["active", "paused"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, input.id), eq(agents.organizationId, ctx.organization.id)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Agent not found" });
      }

      if (input.status === "active") {
        if (!existing.greeting?.trim()) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Add a greeting before activating this receptionist",
          });
        }
        if (!existing.services.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Add at least one service before activating this receptionist",
          });
        }
        if (existing.primaryLanguage !== "en") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Only English calls are supported in this release",
          });
        }
        await assertUniqueSlug(existing.slug, existing.id);
      }

      const [updated] = await db
        .update(agents)
        .set({ status: input.status })
        .where(eq(agents.id, existing.id))
        .returning();

      return updated;
    }),

  getPublicBySlug: publicProcedure
    .input(z.object({ slug: z.string().min(3).max(40) }))
    .query(async ({ input }) => {
      const [result] = await db
        .select({
          id: agents.id,
          slug: agents.slug,
          name: agents.name,
          description: agents.description,
          status: agents.status,
          useCase: agents.useCase,
          greeting: agents.greeting,
          businessName: agents.businessName,
          widgetButtonLabel: agents.widgetButtonLabel,
          widgetAccentColor: agents.widgetAccentColor,
          organizationName: organizations.name,
        })
        .from(agents)
        .innerJoin(organizations, eq(agents.organizationId, organizations.id))
        .where(eq(agents.slug, input.slug))
        .limit(1);

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receptionist not found" });
      }

      return result;
    }),

});
