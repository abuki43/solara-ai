import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    LIVEKIT_URL: z.string().min(1),
    LIVEKIT_API_KEY: z.string().min(1),
    LIVEKIT_API_SECRET: z.string().min(1),
    INTERNAL_API_KEY: z.string().min(32),
    INTERNAL_API_URL: z.url().default("http://localhost:3000"),
    TELEGRAM_BOT_TOKEN: z.string().min(20).optional(),
    TELEGRAM_WEBHOOK_SECRET: z.string().min(32).optional(),
    UPLOAD_DIR: z.string().min(1).optional(),
    CARTESIA_API_KEY: z.string().min(1).optional(),
    /** Addis AI key for Amharic STT/LLM/TTS. Required when ADDIS_AMHARIC_ENABLED=true. */
    ADDIS_API_KEY: z.string().min(1).optional(),
    /** Feature gate: allow Amharic calls + activation when true and ADDIS_API_KEY is set. */
    ADDIS_AMHARIC_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
