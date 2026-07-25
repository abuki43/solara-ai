import { createContext } from "@solar-ai/api/context";
import { appRouter } from "@solar-ai/api/routers/index";
import { auth } from "@solar-ai/auth";
import { env } from "@solar-ai/env/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express from "express";
import { internalAgentRouter } from "./routes/internal-agent.js";
import { livekitRouter } from "./routes/livekit.js";
import { telegramWebhookRouter } from "./routes/telegram-webhook.js";

const app = express();

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;

  if (env.NODE_ENV === "development" && /^http:\/\/localhost:\d+$/.test(origin)) {
    return true;
  }

  return origin === env.CORS_ORIGIN;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, origin ?? env.CORS_ORIGIN);
        return;
      }

      callback(new Error(`Origin ${origin ?? "unknown"} not allowed by CORS`));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Internal-Key"],
    credentials: true,
  }),
);

app.use(express.json());

app.all("/api/auth{/*path}", toNodeHandler(auth));
app.use("/api/livekit", livekitRouter);
app.use("/api/internal", internalAgentRouter);
app.use("/api/integrations/telegram", telegramWebhookRouter);

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
