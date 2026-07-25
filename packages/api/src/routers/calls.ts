import { CALL_DISPLAY_OUTCOMES } from "../lib/call-outcome";
import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { bookings } from "@solar-ai/db/schema/booking";
import { callSessions } from "@solar-ai/db/schema/call-session";
import { handoffRequests } from "@solar-ai/db/schema/telegram";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { orgOwnerProcedure } from "../lib/org-procedure";
import { router } from "../index";

const outcomeSchema = z.enum(CALL_DISPLAY_OUTCOMES);
const PAGE_SIZE = 20;

export const callsRouter = router({
  list: orgOwnerProcedure
    .input(
      z.object({
        agentId: z.string().min(1).optional(),
        allAgents: z.boolean().default(false),
        outcome: outcomeSchema.optional(),
        from: z.string().datetime().optional(),
        to: z.string().datetime().optional(),
        page: z.number().int().min(1).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const orgAgents = await db
        .select({ id: agents.id, name: agents.name })
        .from(agents)
        .where(eq(agents.organizationId, ctx.organization.id));

      const agentIds = orgAgents.map((agent) => agent.id);
      if (!agentIds.length) {
        return { items: [], page: input.page, pageSize: PAGE_SIZE, total: 0 };
      }

      if (input.agentId && !agentIds.includes(input.agentId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receptionist not found" });
      }

      const scopedAgentIds =
        !input.allAgents && input.agentId ? [input.agentId] : agentIds;

      const filters = [inArray(callSessions.agentId, scopedAgentIds)];
      if (input.outcome) filters.push(eq(callSessions.outcome, input.outcome));
      if (input.from) filters.push(gte(callSessions.startedAt, new Date(input.from)));
      if (input.to) filters.push(lte(callSessions.startedAt, new Date(input.to)));

      const where = and(...filters);
      const offset = (input.page - 1) * PAGE_SIZE;

      const [rows, [totalRow]] = await Promise.all([
        db
          .select({
            id: callSessions.id,
            agentId: callSessions.agentId,
            agentName: agents.name,
            roomName: callSessions.roomName,
            callType: callSessions.callType,
            language: callSessions.language,
            outcome: callSessions.outcome,
            durationSec: callSessions.durationSec,
            summary: callSessions.summary,
            bookingId: callSessions.bookingId,
            startedAt: callSessions.startedAt,
            endedAt: callSessions.endedAt,
          })
          .from(callSessions)
          .innerJoin(agents, eq(callSessions.agentId, agents.id))
          .where(where)
          .orderBy(desc(callSessions.startedAt))
          .limit(PAGE_SIZE)
          .offset(offset),
        db.select({ value: count() }).from(callSessions).where(where),
      ]);

      return {
        items: rows,
        page: input.page,
        pageSize: PAGE_SIZE,
        total: totalRow?.value ?? 0,
      };
    }),

  getById: orgOwnerProcedure
    .input(z.object({ callId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({
          call: callSessions,
          agentName: agents.name,
        })
        .from(callSessions)
        .innerJoin(agents, eq(callSessions.agentId, agents.id))
        .where(
          and(
            eq(callSessions.id, input.callId),
            eq(agents.organizationId, ctx.organization.id),
          ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Call not found" });
      }

      const [[booking], [handoff]] = await Promise.all([
        row.call.bookingId
          ? db
              .select({
                id: bookings.id,
                confirmationCode: bookings.confirmationCode,
                serviceName: bookings.serviceName,
                callerName: bookings.callerName,
                callerContact: bookings.callerContact,
                startTime: bookings.startTime,
                status: bookings.status,
              })
              .from(bookings)
              .where(eq(bookings.id, row.call.bookingId))
              .limit(1)
          : Promise.resolve([] as const),
        db
          .select({
            id: handoffRequests.id,
            reason: handoffRequests.reason,
            callerName: handoffRequests.callerName,
            callerContact: handoffRequests.callerContact,
            status: handoffRequests.status,
            deliveredAt: handoffRequests.deliveredAt,
          })
          .from(handoffRequests)
          .where(eq(handoffRequests.roomName, row.call.roomName))
          .orderBy(desc(handoffRequests.createdAt))
          .limit(1),
      ]);

      return {
        ...row.call,
        agentName: row.agentName,
        booking: booking ?? null,
        handoff: handoff ?? null,
      };
    }),

  stats: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1).optional() }))
    .query(async ({ ctx, input }) => {
      const orgAgents = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.organizationId, ctx.organization.id));
      const agentIds = orgAgents.map((agent) => agent.id);
      if (!agentIds.length) return { total: 0, booked: 0, handoff: 0 };

      const scoped = input.agentId ? [input.agentId] : agentIds;
      const [totals] = await db
        .select({
          total: count(),
          booked: sql<number>`count(*) filter (where ${callSessions.outcome} = 'booked')`,
          handoff: sql<number>`count(*) filter (where ${callSessions.outcome} = 'handoff')`,
        })
        .from(callSessions)
        .where(inArray(callSessions.agentId, scoped));

      return {
        total: totals?.total ?? 0,
        booked: Number(totals?.booked ?? 0),
        handoff: Number(totals?.handoff ?? 0),
      };
    }),
});
