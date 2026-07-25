import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "../index";
import { ensureOrganization } from "./ensure-organization";

export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const organization = await ensureOrganization(ctx.session.user.id);

  return next({
    ctx: {
      ...ctx,
      organization,
    },
  });
});

export const orgOwnerProcedure = orgProcedure.use(async ({ ctx, next }) => {
  if (ctx.organization.userId !== ctx.session.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this organization",
    });
  }

  return next({ ctx });
});
