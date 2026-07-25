import { sendTelegramMessage } from "@solar-ai/api/lib/telegram";
import { buildAvailableSlots, getBookingLockUnits } from "@solar-ai/api/lib/booking-engine";
import { db } from "@solar-ai/db";
import { agents, type AgentService, type BusinessHours } from "@solar-ai/db/schema/agent";
import {
  availabilitySlots,
  bookingBlockedTimes,
  bookingSlotLocks,
  bookings,
} from "@solar-ai/db/schema/booking";
import { callSessions } from "@solar-ai/db/schema/call-session";
import { organizations } from "@solar-ai/db/schema/organization";
import { agentTools, telegramConnections } from "@solar-ai/db/schema/telegram";
import { env } from "@solar-ai/env/server";
import { and, eq, gt, gte, lt } from "drizzle-orm";
import { Router } from "express";
import { DateTime } from "luxon";
import { z } from "zod";

export const internalBookingRouter: Router = Router();

function isAuthorized(req: { header(name: string): string | undefined }) {
  return req.header("X-Internal-Key") === env.INTERNAL_API_KEY;
}

function findService(services: AgentService[], serviceName: string, enabledIds?: string[] | null) {
  const normalizedKey = serviceName.trim().toLowerCase().replace(/\s+/g, "");
  return services.find(
    (service) => {
      if (!service.bookable) return false;
      if (enabledIds?.length && !enabledIds.includes(service.id)) return false;
      const serviceKey = service.name.trim().toLowerCase().replace(/\s+/g, "");
      return (
        serviceKey === normalizedKey ||
        serviceKey.includes(normalizedKey) ||
        normalizedKey.includes(serviceKey)
      );
    },
  );
}

async function loadBookingAgent(agentId: string) {
  const [result] = await db
    .select({ agent: agents, organization: organizations, tools: agentTools })
    .from(agents)
    .innerJoin(organizations, eq(agents.organizationId, organizations.id))
    .innerJoin(agentTools, eq(agentTools.agentId, agents.id))
    .where(
      and(
        eq(agents.id, agentId),
        eq(agents.status, "active"),
        eq(agentTools.bookingEnabled, true),
      ),
    )
    .limit(1);
  return result;
}

async function loadVerifiedBooking(agentId: string, confirmationCode: string, callerContact: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.agentId, agentId),
        eq(bookings.confirmationCode, confirmationCode.trim().toUpperCase()),
        eq(bookings.callerContact, callerContact.trim()),
      ),
    )
    .limit(1);
  return booking;
}

async function sendLifecycleTelegram(
  result: NonNullable<Awaited<ReturnType<typeof loadBookingAgent>>>,
  booking: typeof bookings.$inferSelect,
  event: "cancelled" | "rescheduled",
) {
  const enabled =
    event === "cancelled"
      ? result.tools.bookingCancellationNotificationsEnabled
      : result.tools.bookingRescheduleNotificationsEnabled;
  if (!enabled) return false;
  const [connection] = await db
    .select()
    .from(telegramConnections)
    .where(eq(telegramConnections.organizationId, result.organization.id))
    .limit(1);
  if (!connection) return false;
  try {
    const localTime = DateTime.fromJSDate(booking.startTime)
      .setZone(result.organization.timezone)
      .toFormat("cccc, LLLL d 'at' h:mm a");
    const message = await sendTelegramMessage(
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
        telegramMessageId: String(message.message_id),
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

async function generateAvailability(
  agentId: string,
  service: AgentService,
  hours: BusinessHours,
  timezone: string,
  localDate: DateTime,
  config: {
    leadMinutes: number;
    bufferMinutes: number;
  },
) {
  const dayStart = localDate.startOf("day").toUTC().toJSDate();
  const dayEnd = localDate.plus({ days: 1 }).startOf("day").toUTC().toJSDate();
  const [blocked, occupied] = await Promise.all([
    db
      .select({ start: bookingBlockedTimes.startsAt, end: bookingBlockedTimes.endsAt })
      .from(bookingBlockedTimes)
      .where(
        and(
          eq(bookingBlockedTimes.agentId, agentId),
          lt(bookingBlockedTimes.startsAt, dayEnd),
          gt(bookingBlockedTimes.endsAt, dayStart),
        ),
      ),
    db
      .select({ unitStart: bookingSlotLocks.unitStart })
      .from(bookingSlotLocks)
      .where(
        and(
          eq(bookingSlotLocks.agentId, agentId),
          gte(bookingSlotLocks.unitStart, dayStart),
          lt(bookingSlotLocks.unitStart, dayEnd),
        ),
      ),
  ]);
  const generated = buildAvailableSlots({
    date: localDate.toISODate()!,
    timezone,
    hours,
    durationMinutes: service.durationMinutes,
    bufferMinutes: config.bufferMinutes,
    leadMinutes: config.leadMinutes,
    blocked,
    occupiedUnitStarts: occupied.map((row) => row.unitStart),
  });

  await db
    .delete(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.agentId, agentId),
        eq(availabilitySlots.serviceId, service.id),
        eq(availabilitySlots.status, "available"),
        gte(availabilitySlots.startTime, dayStart),
        lt(availabilitySlots.startTime, dayEnd),
      ),
    );

  if (generated.length) {
    await db
      .insert(availabilitySlots)
      .values(
        generated.map((slot) => ({
        id: crypto.randomUUID(),
        agentId,
        serviceId: service.id,
          startTime: slot.start,
          endTime: slot.end,
        status: "available",
        })),
      )
      .onConflictDoNothing();
  }

  return db
    .select()
    .from(availabilitySlots)
    .where(
      and(
        eq(availabilitySlots.agentId, agentId),
        eq(availabilitySlots.serviceId, service.id),
        eq(availabilitySlots.status, "available"),
        gte(availabilitySlots.startTime, dayStart),
        lt(availabilitySlots.startTime, dayEnd),
      ),
    )
    .orderBy(availabilitySlots.startTime)
    .limit(8);
}

internalBookingRouter.get("/agent/:id/availability", async (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const input = z
    .object({
      serviceName: z.string().min(1).max(100),
      date: z.iso.date(),
    })
    .safeParse(req.query);
  if (!input.success) {
    res.status(400).json({ error: "A service name and date in YYYY-MM-DD format are required" });
    return;
  }

  const result = await loadBookingAgent(req.params.id);
  if (!result) {
    res.status(409).json({ error: "Booking is not enabled for this receptionist" });
    return;
  }

  const service = findService(
    result.agent.services,
    input.data.serviceName,
    result.tools.bookingServiceIds,
  );
  if (!service) {
    res.status(404).json({ error: "That bookable service was not found" });
    return;
  }

  const requestedDate = DateTime.fromISO(input.data.date, {
    zone: result.organization.timezone,
  }).startOf("day");
  const today = DateTime.now().setZone(result.organization.timezone).startOf("day");
  if (
    !requestedDate.isValid ||
    requestedDate < today ||
    requestedDate > today.plus({ days: result.tools.bookingWindowDays })
  ) {
    res
      .status(400)
      .json({ error: `Choose a date within the next ${result.tools.bookingWindowDays} days` });
    return;
  }

  const slots = await generateAvailability(
    result.agent.id,
    service,
    result.agent.hours,
    result.organization.timezone,
    requestedDate,
    {
      leadMinutes: result.tools.bookingLeadMinutes,
      bufferMinutes: result.tools.bookingBufferMinutes,
    },
  );

  res.json({
    service: { id: service.id, name: service.name, durationMinutes: service.durationMinutes },
    timezone: result.organization.timezone,
    slots: slots.map((slot) => ({
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      localTime: DateTime.fromJSDate(slot.startTime)
        .setZone(result.organization.timezone)
        .toFormat("cccc, LLLL d 'at' h:mm a"),
    })),
  });
});

const bookingInputSchema = z.object({
  roomName: z.string().min(1).max(200),
  serviceName: z.string().min(1).max(100),
  startTime: z.iso.datetime({ offset: true }),
  callerName: z.string().min(1).max(100),
  callerContact: z.string().min(3).max(150),
  consentGiven: z.literal(true),
});

internalBookingRouter.post("/agent/:id/booking", async (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const input = bookingInputSchema.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Confirmed booking details and caller consent are required" });
    return;
  }

  const result = await loadBookingAgent(req.params.id);
  if (!result) {
    res.status(409).json({ error: "Booking is not enabled for this receptionist" });
    return;
  }
  const service = findService(
    result.agent.services,
    input.data.serviceName,
    result.tools.bookingServiceIds,
  );
  if (!service) {
    res.status(404).json({ error: "That bookable service was not found" });
    return;
  }

  const requestedStart = new Date(input.data.startTime);
  const [claimedSlot] = await db
    .update(availabilitySlots)
    .set({ status: "booked" })
    .where(
      and(
        eq(availabilitySlots.agentId, result.agent.id),
        eq(availabilitySlots.serviceId, service.id),
        eq(availabilitySlots.startTime, requestedStart),
        eq(availabilitySlots.status, "available"),
      ),
    )
    .returning();

  if (!claimedSlot) {
    res.status(409).json({
      error: "That time is no longer available. Check availability and offer another time.",
    });
    return;
  }

  let booking: typeof bookings.$inferSelect;
  try {
    const bookingId = crypto.randomUUID();
    const [created] = await db
      .insert(bookings)
      .values({
        id: bookingId,
        agentId: result.agent.id,
        slotId: claimedSlot.id,
        confirmationCode: crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase(),
        serviceId: service.id,
        serviceName: service.name,
        startTime: claimedSlot.startTime,
        endTime: claimedSlot.endTime,
        callerName: input.data.callerName,
        callerContact: input.data.callerContact,
        roomName: input.data.roomName,
        status: "confirmed",
      })
      .returning();
    if (!created) throw new Error("Booking insert returned no row");
    const units = getBookingLockUnits(
      claimedSlot.startTime,
      claimedSlot.endTime,
      result.tools.bookingBufferMinutes,
    );
    await db.insert(bookingSlotLocks).values(
      units.map((unitStart) => ({
        id: crypto.randomUUID(),
        bookingId,
        agentId: result.agent.id,
        unitStart,
      })),
    );
    booking = created;
  } catch (error) {
    await db
      .delete(bookings)
      .where(
        and(
          eq(bookings.agentId, result.agent.id),
          eq(bookings.slotId, claimedSlot.id),
        ),
      );
    await db
      .update(availabilitySlots)
      .set({ status: "available" })
      .where(eq(availabilitySlots.id, claimedSlot.id));
    console.error("Booking persistence failed:", error);
    res.status(500).json({ error: "The booking could not be saved. Please try another time." });
    return;
  }

  let telegramDelivered = false;
  if (result.tools.bookingNotificationsEnabled) {
    const [connection] = await db
      .select()
      .from(telegramConnections)
      .where(eq(telegramConnections.organizationId, result.organization.id))
      .limit(1);

    if (connection) {
      try {
        const localTime = DateTime.fromJSDate(booking.startTime)
          .setZone(result.organization.timezone)
          .toFormat("cccc, LLLL d 'at' h:mm a");
        const message = await sendTelegramMessage(
          connection.chatId,
          [
            "New confirmed Solar AI booking",
            `Confirmation: ${booking.confirmationCode}`,
            `Business: ${result.organization.name}`,
            `Service: ${booking.serviceName}`,
            `Time: ${localTime}`,
            `Caller: ${booking.callerName}`,
            `Contact: ${booking.callerContact}`,
            "Manage: /bookings",
          ].join("\n"),
        );
        telegramDelivered = true;
        await db
          .update(bookings)
          .set({
            telegramStatus: "sent",
            telegramMessageId: String(message.message_id),
          })
          .where(eq(bookings.id, booking.id));
      } catch (error) {
        await db
          .update(bookings)
          .set({
            telegramStatus: "failed",
            telegramError: (error instanceof Error ? error.message : "Delivery failed").slice(
              0,
              500,
            ),
          })
          .where(eq(bookings.id, booking.id));
      }
    }
  }

  const localTime = DateTime.fromJSDate(booking.startTime)
    .setZone(result.organization.timezone)
    .toFormat("cccc, LLLL d 'at' h:mm a");
  await db
    .update(callSessions)
    .set({ bookingId: booking.id, outcome: "booked" })
    .where(eq(callSessions.roomName, input.data.roomName));
  res.json({
    success: true,
    bookingId: booking.id,
    confirmationCode: booking.confirmationCode,
    telegramDelivered,
    message: `${service.name} is confirmed for ${localTime}.`,
  });
});

const verifiedBookingSchema = z.object({
  confirmationCode: z.string().min(6).max(30),
  callerContact: z.string().min(3).max(150),
});

internalBookingRouter.post("/agent/:id/booking/lookup", async (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const input = verifiedBookingSchema.safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Confirmation code and matching contact are required" });
    return;
  }
  const booking = await loadVerifiedBooking(
    req.params.id,
    input.data.confirmationCode,
    input.data.callerContact,
  );
  if (!booking) {
    res.status(404).json({ error: "No booking matched that confirmation code and contact" });
    return;
  }
  res.json({
    bookingId: booking.id,
    confirmationCode: booking.confirmationCode,
    serviceName: booking.serviceName,
    startTime: booking.startTime.toISOString(),
    endTime: booking.endTime.toISOString(),
    status: booking.status,
  });
});

internalBookingRouter.post("/agent/:id/booking/cancel", async (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const input = verifiedBookingSchema
    .extend({
      reason: z.string().min(1).max(500),
      roomName: z.string().min(1).max(200),
      confirmed: z.literal(true),
    })
    .safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Verified booking details and explicit confirmation are required" });
    return;
  }
  const result = await loadBookingAgent(req.params.id);
  const booking = await loadVerifiedBooking(
    req.params.id,
    input.data.confirmationCode,
    input.data.callerContact,
  );
  if (!result || !booking || booking.status !== "confirmed") {
    res.status(409).json({ error: "That confirmed booking could not be found" });
    return;
  }
  const [cancelled] = await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancellationReason: input.data.reason,
      cancelledAt: new Date(),
      telegramStatus: "not_sent",
    })
    .where(and(eq(bookings.id, booking.id), eq(bookings.status, "confirmed")))
    .returning();
  if (!cancelled) {
    res.status(409).json({ error: "The booking changed; look it up again" });
    return;
  }
  await db.delete(bookingSlotLocks).where(eq(bookingSlotLocks.bookingId, booking.id));
  if (booking.slotId) {
    await db
      .update(availabilitySlots)
      .set({ status: "available" })
      .where(eq(availabilitySlots.id, booking.slotId));
  }
  await db
    .update(callSessions)
    .set({ bookingId: booking.id, outcome: "completed" })
    .where(eq(callSessions.roomName, input.data.roomName));
  const telegramDelivered = await sendLifecycleTelegram(result, cancelled, "cancelled");
  res.json({
    success: true,
    telegramDelivered,
    message: `Booking ${cancelled.confirmationCode} was cancelled successfully.`,
  });
});

internalBookingRouter.post("/agent/:id/booking/reschedule", async (req, res) => {
  if (!isAuthorized(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const input = verifiedBookingSchema
    .extend({
      startTime: z.iso.datetime({ offset: true }),
      roomName: z.string().min(1).max(200),
      confirmed: z.literal(true),
    })
    .safeParse(req.body);
  if (!input.success) {
    res.status(400).json({ error: "Verified booking details and explicit confirmation are required" });
    return;
  }
  const result = await loadBookingAgent(req.params.id);
  const booking = await loadVerifiedBooking(
    req.params.id,
    input.data.confirmationCode,
    input.data.callerContact,
  );
  if (!result || !booking || booking.status !== "confirmed") {
    res.status(409).json({ error: "That confirmed booking could not be found" });
    return;
  }
  const start = new Date(input.data.startTime);
  const service = result.agent.services.find((candidate) => candidate.id === booking.serviceId);
  const localDate = DateTime.fromJSDate(start).setZone(result.organization.timezone).startOf("day");
  if (!service) {
    res.status(409).json({ error: "The original service is no longer bookable" });
    return;
  }
  const available = await generateAvailability(
    result.agent.id,
    service,
    result.agent.hours,
    result.organization.timezone,
    localDate,
    {
      leadMinutes: result.tools.bookingLeadMinutes,
      bufferMinutes: result.tools.bookingBufferMinutes,
    },
  );
  if (!available.some((slot) => slot.startTime.getTime() === start.getTime())) {
    res.status(409).json({ error: "That new time is unavailable. Offer another available time." });
    return;
  }
  const end = new Date(start.getTime() + (booking.endTime.getTime() - booking.startTime.getTime()));
  const replacementId = crypto.randomUUID();
  const [replacement] = await db
    .insert(bookings)
    .values({
      ...booking,
      id: replacementId,
      slotId: null,
      confirmationCode: crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase(),
      startTime: start,
      endTime: end,
      status: "confirmed",
      rescheduledFromId: booking.id,
      cancellationReason: null,
      cancelledAt: null,
      roomName: input.data.roomName,
      telegramStatus: "not_sent",
      telegramMessageId: null,
      telegramError: null,
      createdAt: new Date(),
    })
    .returning();
  try {
    await db.insert(bookingSlotLocks).values(
      getBookingLockUnits(start, end, result.tools.bookingBufferMinutes).map((unitStart) => ({
        id: crypto.randomUUID(),
        bookingId: replacementId,
        agentId: result.agent.id,
        unitStart,
      })),
    );
    const [oldCancelled] = await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancellationReason: `Rescheduled to ${replacement!.confirmationCode}`,
        cancelledAt: new Date(),
      })
      .where(and(eq(bookings.id, booking.id), eq(bookings.status, "confirmed")))
      .returning();
    if (!oldCancelled) throw new Error("Original booking changed");
    await db.delete(bookingSlotLocks).where(eq(bookingSlotLocks.bookingId, booking.id));
    if (booking.slotId) {
      await db
        .update(availabilitySlots)
        .set({ status: "available" })
        .where(eq(availabilitySlots.id, booking.slotId));
    }
  } catch {
    await db.delete(bookings).where(eq(bookings.id, replacementId));
    res.status(409).json({
      error: "That new time is unavailable. Re-check availability and offer another time.",
    });
    return;
  }
  await db
    .update(callSessions)
    .set({ bookingId: replacementId, outcome: "booked" })
    .where(eq(callSessions.roomName, input.data.roomName));
  const telegramDelivered = await sendLifecycleTelegram(result, replacement!, "rescheduled");
  res.json({
    success: true,
    confirmationCode: replacement!.confirmationCode,
    telegramDelivered,
    message: `The booking was rescheduled successfully. New confirmation code: ${replacement!.confirmationCode}.`,
  });
});
