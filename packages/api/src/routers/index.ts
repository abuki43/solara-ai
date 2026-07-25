import { protectedProcedure, publicProcedure, router } from "../index";
import { agentRouter } from "./agent";
import { bookingRouter } from "./booking";
import { callsRouter } from "./calls";
import { faqRouter } from "./faq";
import { filesRouter } from "./files";
import { knowledgeRouter } from "./knowledge";
import { organizationRouter } from "./organization";
import { telegramRouter } from "./telegram";
import { voiceRouter } from "./voice";

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
  voice: voiceRouter,
  knowledge: knowledgeRouter,
  faq: faqRouter,
  files: filesRouter,
  calls: callsRouter,
});
export type AppRouter = typeof appRouter;
