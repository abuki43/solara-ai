import { env } from "@solar-ai/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { createDb } from "@solar-ai/db";
import * as schema from "@solar-ai/db/schema/auth";

export function createAuth() {
  const db = createDb();
  const isDev = env.NODE_ENV === "development";

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: isDev ? "lax" : "none",
        secure: !isDev,
        httpOnly: true,
      },
    },
    plugins: [],
  });
}

export const auth = createAuth();
