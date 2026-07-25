import { protectedProcedure, publicProcedure, router } from "../index";
import { agentRouter } from "./agent";
import { bookingRouter } from "./booking";
import { organizationRouter } from "./organization";
import { telegramRouter } from "./telegram";

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
  telegram: telegramRouter,
  booking: bookingRouter,
});
export type AppRouter = typeof appRouter;
