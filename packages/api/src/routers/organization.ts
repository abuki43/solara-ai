import { db } from "@solar-ai/db";
import { organizations } from "@solar-ai/db/schema/organization";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { orgOwnerProcedure } from "../lib/org-procedure";
import { router } from "../index";

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")).or(z.undefined()),
  address: z.string().max(200).optional().nullable(),
  timezone: z.string().min(1).max(64).optional(),
});

export const organizationRouter = router({
  get: orgOwnerProcedure.query(({ ctx }) => {
    return ctx.organization;
  }),

  update: orgOwnerProcedure
    .input(updateOrganizationSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(organizations)
        .set({
          ...input,
          website: input.website === "" ? null : input.website,
        })
        .where(eq(organizations.id, ctx.organization.id))
        .returning();

      return updated;
    }),
});
