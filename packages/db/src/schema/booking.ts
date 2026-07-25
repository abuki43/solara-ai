import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { agents } from "./agent";

export const availabilitySlots = pgTable(
  "availability_slots",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    serviceId: text("service_id").notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("available"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("availability_slots_agent_service_start_idx").on(
      table.agentId,
      table.serviceId,
      table.startTime,
    ),
    index("availability_slots_agent_service_idx").on(table.agentId, table.serviceId),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    slotId: text("slot_id").references(() => availabilitySlots.id, { onDelete: "set null" }),
    confirmationCode: text("confirmation_code").unique(),
    serviceId: text("service_id").notNull(),
    serviceName: text("service_name").notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    callerName: text("caller_name").notNull(),
    callerContact: text("caller_contact").notNull(),
    roomName: text("room_name").notNull(),
    status: text("status").notNull().default("confirmed"),
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at"),
    rescheduledFromId: text("rescheduled_from_id"),
    ownerNotes: text("owner_notes"),
    telegramStatus: text("telegram_status").notNull().default("not_sent"),
    telegramMessageId: text("telegram_message_id"),
    telegramError: text("telegram_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("bookings_agent_id_idx").on(table.agentId),
    index("bookings_start_time_idx").on(table.startTime),
  ],
);

export const bookingSlotLocks = pgTable(
  "booking_slot_locks",
  {
    id: text("id").primaryKey(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    unitStart: timestamp("unit_start", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("booking_slot_locks_agent_unit_idx").on(table.agentId, table.unitStart),
    index("booking_slot_locks_booking_id_idx").on(table.bookingId),
  ],
);

export const bookingBlockedTimes = pgTable(
  "booking_blocked_times",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("booking_blocked_times_agent_start_idx").on(table.agentId, table.startsAt),
  ],
);
