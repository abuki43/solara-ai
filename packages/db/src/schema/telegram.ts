import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { agents } from "./agent";
import { organizations } from "./organization";

export const telegramConnections = pgTable(
  "telegram_connections",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: "cascade" }),
    chatId: text("chat_id").notNull(),
    chatType: text("chat_type").notNull(),
    chatTitle: text("chat_title"),
    username: text("username"),
    status: text("status").notNull().default("connected"),
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("telegram_connections_chat_id_idx").on(table.chatId)],
);

export const telegramConnectTokens = pgTable(
  "telegram_connect_tokens",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("telegram_connect_tokens_org_idx").on(table.organizationId)],
);

export const agentTools = pgTable(
  "agent_tools",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .unique()
      .references(() => agents.id, { onDelete: "cascade" }),
    telegramEnabled: boolean("telegram_enabled").notNull().default(false),
    bookingEnabled: boolean("booking_enabled").notNull().default(false),
    bookingNotificationsEnabled: boolean("booking_notifications_enabled")
      .notNull()
      .default(true),
    bookingCancellationNotificationsEnabled: boolean(
      "booking_cancellation_notifications_enabled",
    )
      .notNull()
      .default(true),
    bookingRescheduleNotificationsEnabled: boolean(
      "booking_reschedule_notifications_enabled",
    )
      .notNull()
      .default(true),
    bookingLeadMinutes: integer("booking_lead_minutes").notNull().default(60),
    bookingWindowDays: integer("booking_window_days").notNull().default(14),
    bookingBufferMinutes: integer("booking_buffer_minutes").notNull().default(0),
    bookingServiceIds: jsonb("booking_service_ids").$type<string[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("agent_tools_agent_id_idx").on(table.agentId)],
);

export const handoffRequests = pgTable(
  "handoff_requests",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    roomName: text("room_name").notNull(),
    callerName: text("caller_name").notNull(),
    callerContact: text("caller_contact").notNull(),
    reason: text("reason").notNull(),
    consentAt: timestamp("consent_at").notNull(),
    status: text("status").notNull().default("pending"),
    telegramMessageId: text("telegram_message_id"),
    deliveryError: text("delivery_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    deliveredAt: timestamp("delivered_at"),
  },
  (table) => [
    index("handoff_requests_agent_id_idx").on(table.agentId),
    index("handoff_requests_created_at_idx").on(table.createdAt),
  ],
);

export const telegramConnectionsRelations = relations(telegramConnections, ({ one }) => ({
  organization: one(organizations, {
    fields: [telegramConnections.organizationId],
    references: [organizations.id],
  }),
}));

export const agentToolsRelations = relations(agentTools, ({ one }) => ({
  agent: one(agents, {
    fields: [agentTools.agentId],
    references: [agents.id],
  }),
}));
