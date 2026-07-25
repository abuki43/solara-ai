import {
  deriveCallOutcome,
  isProtectedCallOutcome,
} from "@solar-ai/api/lib/call-outcome";
import { MAX_SUMMARY_CHARS, buildCallSummary } from "@solar-ai/api/lib/call-summary";
import { db } from "@solar-ai/db";
import { callSessions } from "@solar-ai/db/schema/call-session";
import { env } from "@solar-ai/env/server";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";

export const internalCallLogRouter: Router = Router();

const callLogSchema = z.object({
  roomName: z.string().min(1).max(200),
  language: z.enum(["en", "am", "om"]).default("en"),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  toolsUsed: z.array(z.string().min(1).max(60)).max(20).default([]),
  notes: z.array(z.string().max(200)).max(10).optional(),
  summary: z.string().max(MAX_SUMMARY_CHARS).optional(),
  failed: z.boolean().optional(),
});

internalCallLogRouter.post("/call-log", async (req, res) => {
  if (req.header("X-Internal-Key") !== env.INTERNAL_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = callLogSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid call log" });
    return;
  }

  const [session] = await db
    .select()
    .from(callSessions)
    .where(eq(callSessions.roomName, parsed.data.roomName))
    .limit(1);

  if (!session) {
    res.status(404).json({ error: "Call session not found" });
    return;
  }

  const endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : new Date();
  const startedAt = parsed.data.startedAt
    ? new Date(parsed.data.startedAt)
    : session.startedAt;
  const durationSec = Math.max(
    0,
    Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
  );

  const derivedOutcome = deriveCallOutcome({
    toolsUsed: parsed.data.toolsUsed,
    durationSec,
    failed: parsed.data.failed,
  });

  // Prefer richer outcomes already written by booking/handoff paths.
  const outcome = isProtectedCallOutcome(session.outcome)
    ? session.outcome
    : derivedOutcome;

  const summary =
    parsed.data.summary?.trim() ||
    buildCallSummary({
      toolsUsed: parsed.data.toolsUsed,
      outcome,
      notes: parsed.data.notes,
    });

  const [updated] = await db
    .update(callSessions)
    .set({
      language: parsed.data.language,
      durationSec,
      summary: summary.slice(0, MAX_SUMMARY_CHARS),
      outcome,
      endedAt: session.endedAt ?? endedAt,
    })
    .where(eq(callSessions.roomName, parsed.data.roomName))
    .returning({
      id: callSessions.id,
      outcome: callSessions.outcome,
      durationSec: callSessions.durationSec,
      summary: callSessions.summary,
      language: callSessions.language,
    });

  res.json({ success: true, call: updated });
});
