import { db } from "@solar-ai/db";
import { agents, type AgentService } from "@solar-ai/db/schema/agent";
import {
  availabilitySlots,
  bookingBlockedTimes,
  bookingSlotLocks,
  bookings,
} from "@solar-ai/db/schema/booking";
import { organizations } from "@solar-ai/db/schema/organization";
import { agentTools, telegramConnections } from "@solar-ai/db/schema/telegram";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, gte, lt } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";

import { buildAvailableSlots, getBookingLockUnits } from "../lib/booking-engine";
import { sendTelegramMessage } from "../lib/telegram";
import { orgOwnerProcedure } from "../lib/org-procedure";
import { router } from "../index";

const agentInput = z.object({ agentId: z.string().min(1) });

async function loadOwnedAgent(organizationId: string, agentId: string) {
  const [row] = await db
    .select({ agent: agents, organization: organizations, tools: agentTools })
    .from(agents)
    .innerJoin(organizations, eq(agents.organizationId, organizations.id))
    .leftJoin(agentTools, eq(agentTools.agentId, agents.id))
    .where(and(eq(agents.id, agentId), eq(agents.organizationId, organizationId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Receptionist not found" });
  return row;
}

async function loadOwnedBooking(organizationId: string, bookingId: string) {
  const [row] = await db
    .select({ booking: bookings, agentName: agents.name })
    .from(bookings)
    .innerJoin(agents, eq(bookings.agentId, agents.id))
    .where(and(eq(bookings.id, bookingId), eq(agents.organizationId, organizationId)))
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  return row;
}

function selectedServices(services: AgentService[], selectedIds?: string[] | null) {
  return services.filter(
    (service) => service.bookable && (!selectedIds?.length || selectedIds.includes(service.id)),
  );
}

function validTimezone(timezone: string) {
  try {
    Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function confirmationCode() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
}

async function claimLocks(input: {
  bookingId: string;
  agentId: string;
  start: Date;
  end: Date;
  bufferMinutes: number;
}) {
  try {
    await db.insert(bookingSlotLocks).values(
      getBookingLockUnits(input.start, input.end, input.bufferMinutes).map((unitStart) => ({
        id: crypto.randomUUID(),
        bookingId: input.bookingId,
        agentId: input.agentId,
        unitStart,
      })),
    );
  } catch {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That time overlaps another booking. Choose an available time.",
    });
  }
}

async function notifyBooking(
  organizationId: string,
  timezone: string,
  booking: typeof bookings.$inferSelect,
  event: "confirmed" | "cancelled" | "rescheduled",
) {
  const [[tools], [connection]] = await Promise.all([
    db.select().from(agentTools).where(eq(agentTools.agentId, booking.agentId)).limit(1),
    db
      .select()
      .from(telegramConnections)
      .where(eq(telegramConnections.organizationId, organizationId))
      .limit(1),
  ]);
  const enabled =
    event === "confirmed"
      ? tools?.bookingNotificationsEnabled
      : event === "cancelled"
        ? tools?.bookingCancellationNotificationsEnabled
        : tools?.bookingRescheduleNotificationsEnabled;
  if (!enabled || !connection) {
    await db
      .update(bookings)
      .set({ telegramStatus: "not_sent", telegramError: null })
      .where(eq(bookings.id, booking.id));
    return false;
  }

  try {
    const localTime = DateTime.fromJSDate(booking.startTime)
      .setZone(timezone)
      .toFormat("cccc, LLLL d 'at' h:mm a");
    const sent = await sendTelegramMessage(
      connection.chatId,
      [
        `Booking ${event}`,
        `Confirmation: ${booking.confirmationCode ?? booking.id.slice(0, 8)}`,
        `Service: ${booking.serviceName}`,
        `Time: ${localTime}`,
        `Caller: ${booking.callerName}`,
        `Contact: ${booking.callerContact}`,
        "Manage: /bookings",
      ].join("\n"),
    );
    await db
      .update(bookings)
      .set({
        telegramStatus: "sent",
        telegramMessageId: String(sent.message_id),
        telegramError: null,
      })
      .where(eq(bookings.id, booking.id));
    return true;
  } catch (error) {
    await db
      .update(bookings)
      .set({
        telegramStatus: "failed",
        telegramError: (error instanceof Error ? error.message : "Delivery failed").slice(0, 500),
      })
      .where(eq(bookings.id, booking.id));
    return false;
  }
}

async function availabilityFor(input: {
  agentId: string;
  service: AgentService;
  date: string;
  timezone: string;
  hours: typeof agents.$inferSelect.hours;
  leadMinutes: number;
  bufferMinutes: number;
}) {
  const localDate = DateTime.fromISO(input.date, { zone: input.timezone }).startOf("day");
  if (!localDate.isValid) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date or timezone" });
  }
  const start = localDate.toUTC().toJSDate();
  const end = localDate.plus({ days: 1 }).toUTC().toJSDate();
  const [blocked, locks] = await Promise.all([
    db
      .select({ start: bookingBlockedTimes.startsAt, end: bookingBlockedTimes.endsAt })
      .from(bookingBlockedTimes)
      .where(
        and(
          eq(bookingBlockedTimes.agentId, input.agentId),
          lt(bookingBlockedTimes.startsAt, end),
          gt(bookingBlockedTimes.endsAt, start),
        ),
      ),
    db
      .select({ unitStart: bookingSlotLocks.unitStart })
      .from(bookingSlotLocks)
      .where(
        and(
          eq(bookingSlotLocks.agentId, input.agentId),
          gte(bookingSlotLocks.unitStart, start),
          lt(bookingSlotLocks.unitStart, end),
        ),
      ),
  ]);
  return buildAvailableSlots({
    date: input.date,
    timezone: input.timezone,
    hours: input.hours,
    durationMinutes: input.service.durationMinutes,
    bufferMinutes: input.bufferMinutes,
    leadMinutes: input.leadMinutes,
    blocked,
    occupiedUnitStarts: locks.map((lock) => lock.unitStart),
  });
}

export const bookingRouter = router({
  getStatus: orgOwnerProcedure.input(agentInput).query(async ({ ctx, input }) => {
    const { agent, organization, tools } = await loadOwnedAgent(ctx.organization.id, input.agentId);
    const services = selectedServices(agent.services, tools?.bookingServiceIds);
    const hasHours = Object.values(agent.hours).some(
      (hours) => !hours.closed && Boolean(hours.open && hours.close),
    );
    const [futureSlots, [telegram]] = await Promise.all([
      db
        .select({ id: availabilitySlots.id })
        .from(availabilitySlots)
        .where(
          and(
            eq(availabilitySlots.agentId, agent.id),
            eq(availabilitySlots.status, "available"),
            gte(availabilitySlots.startTime, new Date()),
          ),
        ),
      db
        .select({ id: telegramConnections.id })
        .from(telegramConnections)
        .where(eq(telegramConnections.organizationId, ctx.organization.id))
        .limit(1),
    ]);
    const ready =
      agent.status === "active" &&
      validTimezone(organization.timezone) &&
      services.length > 0 &&
      hasHours &&
      futureSlots.length > 0;
    return {
      enabled: tools?.bookingEnabled ?? false,
      bookingNotificationsEnabled: tools?.bookingNotificationsEnabled ?? true,
      bookingCancellationNotificationsEnabled:
        tools?.bookingCancellationNotificationsEnabled ?? true,
      bookingRescheduleNotificationsEnabled:
        tools?.bookingRescheduleNotificationsEnabled ?? true,
      leadMinutes: tools?.bookingLeadMinutes ?? 60,
      windowDays: tools?.bookingWindowDays ?? 14,
      bufferMinutes: tools?.bookingBufferMinutes ?? 0,
      selectedServiceIds: tools?.bookingServiceIds ?? services.map((service) => service.id),
      telegramConnected: Boolean(telegram),
      ready,
      agentActive: agent.status === "active",
      timezoneValid: validTimezone(organization.timezone),
      availableSlotCount: futureSlots.length,
      bookableServices: agent.services.filter((service) => service.bookable),
      hasHours,
    };
  }),

  updateConfig: orgOwnerProcedure
    .input(
      agentInput.extend({
        serviceIds: z.array(z.string()).max(20),
        leadMinutes: z.number().int().min(0).max(10080),
        windowDays: z.number().int().min(1).max(365),
        bufferMinutes: z.number().int().min(0).max(240).multipleOf(15),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { agent } = await loadOwnedAgent(ctx.organization.id, input.agentId);
      const validIds = new Set(agent.services.filter((service) => service.bookable).map((s) => s.id));
      if (!input.serviceIds.length || input.serviceIds.some((id) => !validIds.has(id))) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select at least one valid bookable service",
        });
      }
      const [tools] = await db
        .insert(agentTools)
        .values({
          id: crypto.randomUUID(),
          agentId: agent.id,
          bookingServiceIds: input.serviceIds,
          bookingLeadMinutes: input.leadMinutes,
          bookingWindowDays: input.windowDays,
          bookingBufferMinutes: input.bufferMinutes,
          bookingEnabled: false,
        })
        .onConflictDoUpdate({
          target: agentTools.agentId,
          set: {
            bookingServiceIds: input.serviceIds,
            bookingLeadMinutes: input.leadMinutes,
            bookingWindowDays: input.windowDays,
            bookingBufferMinutes: input.bufferMinutes,
            bookingEnabled: false,
          },
        })
        .returning();
      await db
        .delete(availabilitySlots)
        .where(
          and(
            eq(availabilitySlots.agentId, agent.id),
            eq(availabilitySlots.status, "available"),
            gte(availabilitySlots.startTime, new Date()),
          ),
        );
      return tools;
    }),

  regenerate: orgOwnerProcedure.input(agentInput).mutation(async ({ ctx, input }) => {
    const { agent, organization, tools } = await loadOwnedAgent(ctx.organization.id, input.agentId);
    const services = selectedServices(agent.services, tools?.bookingServiceIds);
    if (!services.length) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Select a bookable service" });
    }
    await db
      .delete(availabilitySlots)
      .where(
        and(
          eq(availabilitySlots.agentId, agent.id),
          eq(availabilitySlots.status, "available"),
          gte(availabilitySlots.startTime, new Date()),
        ),
      );
    const values: (typeof availabilitySlots.$inferInsert)[] = [];
    const today = DateTime.now().setZone(organization.timezone).startOf("day");
    for (let day = 0; day <= (tools?.bookingWindowDays ?? 14); day += 1) {
      const date = today.plus({ days: day }).toISODate()!;
      for (const service of services) {
        const slots = await availabilityFor({
          agentId: agent.id,
          service,
          date,
          timezone: organization.timezone,
          hours: agent.hours,
          leadMinutes: tools?.bookingLeadMinutes ?? 60,
          bufferMinutes: tools?.bookingBufferMinutes ?? 0,
        });
        values.push(
          ...slots.map((slot) => ({
            id: crypto.randomUUID(),
            agentId: agent.id,
            serviceId: service.id,
            startTime: slot.start,
            endTime: slot.end,
            status: "available",
          })),
        );
      }
    }
    for (let index = 0; index < values.length; index += 500) {
      await db.insert(availabilitySlots).values(values.slice(index, index + 500)).onConflictDoNothing();
    }
    return { count: values.length };
  }),

  setEnabled: orgOwnerProcedure
    .input(agentInput.extend({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const { agent, organization, tools: currentTools } = await loadOwnedAgent(
        ctx.organization.id,
        input.agentId,
      );
      const services = selectedServices(agent.services, currentTools?.bookingServiceIds);
      const hasHours = Object.values(agent.hours).some(
        (hours) => !hours.closed && Boolean(hours.open && hours.close),
      );
      const [generated] = await db
        .select({ id: availabilitySlots.id })
        .from(availabilitySlots)
        .where(
          and(
            eq(availabilitySlots.agentId, agent.id),
            eq(availabilitySlots.status, "available"),
            gte(availabilitySlots.startTime, new Date()),
          ),
        )
        .limit(1);
      if (
        input.enabled &&
        (agent.status !== "active" ||
          !validTimezone(organization.timezone) ||
          !services.length ||
          !hasHours ||
          !generated)
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Activate the agent, configure services/hours, and generate availability first",
        });
      }
      const [tools] = await db
        .insert(agentTools)
        .values({ id: crypto.randomUUID(), agentId: input.agentId, bookingEnabled: input.enabled })
        .onConflictDoUpdate({
          target: agentTools.agentId,
          set: { bookingEnabled: input.enabled },
        })
        .returning();
      return tools;
    }),

  setNotifications: orgOwnerProcedure
    .input(
      agentInput.extend({
        event: z.enum(["confirmed", "cancelled", "rescheduled"]),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await loadOwnedAgent(ctx.organization.id, input.agentId);
      const set =
        input.event === "confirmed"
          ? { bookingNotificationsEnabled: input.enabled }
          : input.event === "cancelled"
            ? { bookingCancellationNotificationsEnabled: input.enabled }
            : { bookingRescheduleNotificationsEnabled: input.enabled };
      return (
        await db
          .insert(agentTools)
          .values({ id: crypto.randomUUID(), agentId: input.agentId, ...set })
          .onConflictDoUpdate({ target: agentTools.agentId, set })
          .returning()
      )[0];
    }),

  previewAvailability: orgOwnerProcedure
    .input(agentInput.extend({ serviceId: z.string(), date: z.iso.date() }))
    .query(async ({ ctx, input }) => {
      const { agent, organization, tools } = await loadOwnedAgent(
        ctx.organization.id,
        input.agentId,
      );
      const service = selectedServices(agent.services, tools?.bookingServiceIds).find(
        (candidate) => candidate.id === input.serviceId,
      );
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      return availabilityFor({
        agentId: agent.id,
        service,
        date: input.date,
        timezone: organization.timezone,
        hours: agent.hours,
        leadMinutes: tools?.bookingLeadMinutes ?? 60,
        bufferMinutes: tools?.bookingBufferMinutes ?? 0,
      });
    }),

  list: orgOwnerProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        filter: z.enum(["upcoming", "past", "cancelled", "all"]).default("upcoming"),
        search: z.string().max(100).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({ booking: bookings, agentName: agents.name })
        .from(bookings)
        .innerJoin(agents, eq(bookings.agentId, agents.id))
        .where(
          and(
            eq(agents.organizationId, ctx.organization.id),
            input.agentId ? eq(bookings.agentId, input.agentId) : undefined,
          ),
        )
        .orderBy(input.filter === "past" ? desc(bookings.startTime) : asc(bookings.startTime));
      const now = new Date();
      const search = input.search?.trim().toLowerCase();
      return rows.filter(({ booking }) => {
        const matchesFilter =
          input.filter === "all" ||
          (input.filter === "cancelled"
            ? booking.status === "cancelled"
            : input.filter === "past"
              ? booking.startTime < now && booking.status !== "cancelled"
              : booking.startTime >= now && booking.status !== "cancelled");
        const matchesSearch =
          !search ||
          [booking.callerName, booking.callerContact, booking.serviceName, booking.confirmationCode]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(search));
        return matchesFilter && matchesSearch;
      });
    }),

  detail: orgOwnerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select({ booking: bookings, agentName: agents.name })
        .from(bookings)
        .innerJoin(agents, eq(bookings.agentId, agents.id))
        .where(and(eq(bookings.id, input.id), eq(agents.organizationId, ctx.organization.id)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      return row;
    }),

  create: orgOwnerProcedure
    .input(
      agentInput.extend({
        serviceId: z.string(),
        startTime: z.iso.datetime({ offset: true }),
        callerName: z.string().min(1).max(100),
        callerContact: z.string().min(3).max(150),
        ownerNotes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { agent, tools } = await loadOwnedAgent(ctx.organization.id, input.agentId);
      const service = selectedServices(agent.services, tools?.bookingServiceIds).find(
        (candidate) => candidate.id === input.serviceId,
      );
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      const start = new Date(input.startTime);
      const end = new Date(start.getTime() + service.durationMinutes * 60_000);
      const id = crypto.randomUUID();
      const [booking] = await db
        .insert(bookings)
        .values({
          id,
          agentId: agent.id,
          confirmationCode: confirmationCode(),
          serviceId: service.id,
          serviceName: service.name,
          startTime: start,
          endTime: end,
          callerName: input.callerName,
          callerContact: input.callerContact,
          roomName: "owner-created",
          status: "confirmed",
          ownerNotes: input.ownerNotes,
        })
        .returning();
      try {
        await claimLocks({
          bookingId: id,
          agentId: agent.id,
          start,
          end,
          bufferMinutes: tools?.bookingBufferMinutes ?? 0,
        });
      } catch (error) {
        await db.delete(bookings).where(eq(bookings.id, id));
        throw error;
      }
      void notifyBooking(ctx.organization.id, ctx.organization.timezone, booking!, "confirmed");
      return booking;
    }),

  cancel: orgOwnerProcedure
    .input(z.object({ id: z.string(), reason: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadOwnedBooking(ctx.organization.id, input.id);
      if (row.booking.status !== "confirmed") {
        throw new TRPCError({ code: "CONFLICT", message: "Only confirmed bookings can be cancelled" });
      }
      const [updated] = await db
        .update(bookings)
        .set({
          status: "cancelled",
          cancellationReason: input.reason,
          cancelledAt: new Date(),
          telegramStatus: "not_sent",
        })
        .where(and(eq(bookings.id, input.id), eq(bookings.status, "confirmed")))
        .returning();
      if (!updated) throw new TRPCError({ code: "CONFLICT", message: "Booking changed" });
      await db.delete(bookingSlotLocks).where(eq(bookingSlotLocks.bookingId, updated.id));
      if (updated.slotId) {
        await db
          .update(availabilitySlots)
          .set({ status: "available" })
          .where(eq(availabilitySlots.id, updated.slotId));
      }
      void notifyBooking(ctx.organization.id, ctx.organization.timezone, updated, "cancelled");
      return updated;
    }),

  reschedule: orgOwnerProcedure
    .input(z.object({ id: z.string(), startTime: z.iso.datetime({ offset: true }) }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadOwnedBooking(ctx.organization.id, input.id);
      if (row.booking.status !== "confirmed") {
        throw new TRPCError({ code: "CONFLICT", message: "Only confirmed bookings can be moved" });
      }
      const { tools } = await loadOwnedAgent(ctx.organization.id, row.booking.agentId);
      const start = new Date(input.startTime);
      const duration = row.booking.endTime.getTime() - row.booking.startTime.getTime();
      const end = new Date(start.getTime() + duration);
      const id = crypto.randomUUID();
      const [replacement] = await db
        .insert(bookings)
        .values({
          ...row.booking,
          id,
          slotId: null,
          confirmationCode: confirmationCode(),
          startTime: start,
          endTime: end,
          status: "confirmed",
          rescheduledFromId: row.booking.id,
          cancellationReason: null,
          cancelledAt: null,
          telegramStatus: "not_sent",
          telegramMessageId: null,
          telegramError: null,
          createdAt: new Date(),
        })
        .returning();
      try {
        await claimLocks({
          bookingId: id,
          agentId: row.booking.agentId,
          start,
          end,
          bufferMinutes: tools?.bookingBufferMinutes ?? 0,
        });
        const [cancelled] = await db
          .update(bookings)
          .set({
            status: "cancelled",
            cancellationReason: `Rescheduled to ${replacement!.confirmationCode}`,
            cancelledAt: new Date(),
          })
          .where(and(eq(bookings.id, row.booking.id), eq(bookings.status, "confirmed")))
          .returning();
        if (!cancelled) throw new Error("Original booking changed");
        await db.delete(bookingSlotLocks).where(eq(bookingSlotLocks.bookingId, row.booking.id));
        if (row.booking.slotId) {
          await db
            .update(availabilitySlots)
            .set({ status: "available" })
            .where(eq(availabilitySlots.id, row.booking.slotId));
        }
      } catch (error) {
        await db.delete(bookings).where(eq(bookings.id, id));
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "CONFLICT", message: "Reschedule failed safely; try again" });
      }
      void notifyBooking(ctx.organization.id, ctx.organization.timezone, replacement!, "rescheduled");
      return replacement;
    }),

  setLifecycleStatus: orgOwnerProcedure
    .input(z.object({ id: z.string(), status: z.enum(["completed", "no_show"]) }))
    .mutation(async ({ ctx, input }) => {
      await loadOwnedBooking(ctx.organization.id, input.id);
      const [updated] = await db
        .update(bookings)
        .set({ status: input.status })
        .where(and(eq(bookings.id, input.id), eq(bookings.status, "confirmed")))
        .returning();
      if (!updated) throw new TRPCError({ code: "CONFLICT", message: "Booking is not confirmed" });
      return updated;
    }),

  createBlock: orgOwnerProcedure
    .input(
      agentInput.extend({
        startsAt: z.iso.datetime({ offset: true }),
        endsAt: z.iso.datetime({ offset: true }),
        reason: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await loadOwnedAgent(ctx.organization.id, input.agentId);
      if (new Date(input.endsAt) <= new Date(input.startsAt)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Block end must be after its start" });
      }
      return (
        await db
          .insert(bookingBlockedTimes)
          .values({
            id: crypto.randomUUID(),
            agentId: input.agentId,
            startsAt: new Date(input.startsAt),
            endsAt: new Date(input.endsAt),
            reason: input.reason,
          })
          .returning()
      )[0];
    }),

  listBlocks: orgOwnerProcedure.input(agentInput).query(async ({ ctx, input }) => {
    await loadOwnedAgent(ctx.organization.id, input.agentId);
    return db
      .select()
      .from(bookingBlockedTimes)
      .where(eq(bookingBlockedTimes.agentId, input.agentId))
      .orderBy(desc(bookingBlockedTimes.startsAt));
  }),

  deleteBlock: orgOwnerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [block] = await db
        .select({ block: bookingBlockedTimes })
        .from(bookingBlockedTimes)
        .innerJoin(agents, eq(bookingBlockedTimes.agentId, agents.id))
        .where(
          and(eq(bookingBlockedTimes.id, input.id), eq(agents.organizationId, ctx.organization.id)),
        )
        .limit(1);
      if (!block) throw new TRPCError({ code: "NOT_FOUND", message: "Blocked time not found" });
      await db.delete(bookingBlockedTimes).where(eq(bookingBlockedTimes.id, input.id));
      return { success: true };
    }),

  retryNotification: orgOwnerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadOwnedBooking(ctx.organization.id, input.id);
      const event = row.booking.rescheduledFromId
        ? "rescheduled"
        : row.booking.status === "cancelled"
          ? "cancelled"
          : "confirmed";
      const delivered = await notifyBooking(
        ctx.organization.id,
        ctx.organization.timezone,
        row.booking,
        event,
      );
      return { delivered };
    }),
});
