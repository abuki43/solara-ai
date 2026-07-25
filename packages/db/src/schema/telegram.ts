import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("agent_tools_agent_id_idx").on(table.agentId)],
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
