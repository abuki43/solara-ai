import { protectedProcedure, publicProcedure, router } from "../index";
import { agentRouter } from "./agent";
import { organizationRouter } from "./organization";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  organization: organizationRouter,
  agent: agentRouter,
});
export type AppRouter = typeof appRouter;
