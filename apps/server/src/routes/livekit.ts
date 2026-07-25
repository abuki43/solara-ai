import { auth } from "@solar-ai/auth";
import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { callSessions } from "@solar-ai/db/schema/call-session";
import { organizations } from "@solar-ai/db/schema/organization";
import { env } from "@solar-ai/env/server";
import { and, eq } from "drizzle-orm";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import {
  AccessToken,
  RoomAgentDispatch,
  RoomConfiguration,
} from "livekit-server-sdk";
import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const AGENT_NAME = "solar-receptionist";

export const livekitRouter: Router = Router();

const tokenInputSchema = z
  .object({
    agentId: z.string().min(1).optional(),
    agentSlug: z.string().min(3).max(40).optional(),
    participantName: z.string().min(1).max(100).optional(),
  })
  .refine((value) => Boolean(value.agentId) !== Boolean(value.agentSlug), {
    message: "Provide exactly one of agentId or agentSlug",
  });

const publicCallLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => Boolean(req.body?.agentId),
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip ?? "127.0.0.1")}:${String(req.body?.agentSlug ?? "unknown")}`,
  message: { error: "Too many calls. Please try again later." },
});

livekitRouter.post("/token", publicCallLimiter, async (req, res) => {
  try {
    const input = tokenInputSchema.parse(req.body);
    const participantName =
      input.participantName ?? `caller-${randomUUID().slice(0, 8)}`;

    let agent: typeof agents.$inferSelect | undefined;
    let callType: "test" | "public";

    if (input.agentId) {
      callType = "test";
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session) {
        res.status(401).json({ error: "Authentication required for test calls" });
        return;
      }

      const [ownedAgent] = await db
        .select({ agent: agents })
        .from(agents)
        .innerJoin(organizations, eq(agents.organizationId, organizations.id))
        .where(and(eq(agents.id, input.agentId), eq(organizations.userId, session.user.id)))
        .limit(1);
      agent = ownedAgent?.agent;
    } else {
      callType = "public";
      const [publicAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.slug, input.agentSlug!))
        .limit(1);
      agent = publicAgent;

      if (agent && agent.status !== "active") {
        res.status(403).json({ error: "This receptionist is not available" });
        return;
      }
    }

    if (!agent) {
      res.status(404).json({ error: "Receptionist not found" });
      return;
    }

    if (agent.primaryLanguage !== "en") {
      res.status(400).json({ error: "Only English calls are supported in this release" });
      return;
    }

    const roomName = `call-${agent.id.slice(0, 8)}-${randomUUID()}`;
    const dispatchMetadata = JSON.stringify({
      agentId: agent.id,
      language: "en",
      callType,
    });

    const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: participantName,
      name: participantName,
      ttl: "10m",
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    token.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: AGENT_NAME,
          metadata: dispatchMetadata,
        }),
      ],
    });

    const jwt = await token.toJwt();

    await db.insert(callSessions).values({
      id: randomUUID(),
      agentId: agent.id,
      roomName,
      callType,
      outcome: "started",
    });

    res.json({
      token: jwt,
      roomName,
      participantName,
      url: env.LIVEKIT_URL,
      agentId: agent.id,
      callType,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid call request" });
      return;
    }
    console.error("Failed to create LiveKit token:", error);
    res.status(500).json({ error: "Failed to create LiveKit token" });
  }
});

livekitRouter.post("/end", async (req, res) => {
  const input = z
    .object({
      roomName: z.string().startsWith("call-").max(200),
      outcome: z.enum(["completed", "disconnected", "failed"]).default("completed"),
    })
    .safeParse(req.body);

  if (!input.success) {
    res.status(400).json({ error: "Invalid call session" });
    return;
  }

  const [updated] = await db
    .update(callSessions)
    .set({ outcome: input.data.outcome, endedAt: new Date() })
    .where(eq(callSessions.roomName, input.data.roomName))
    .returning({ id: callSessions.id });

  if (!updated) {
    res.status(404).json({ error: "Call session not found" });
    return;
  }

  res.json({ success: true });
});
