import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { agents } from "./agent";

export const callSessions = pgTable(
  "call_sessions",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    roomName: text("room_name").notNull().unique(),
    callType: text("call_type").notNull(),
    language: text("language").notNull().default("en"),
    outcome: text("outcome").notNull().default("started"),
    bookingId: text("booking_id"),
    durationSec: integer("duration_sec"),
    summary: text("summary"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
  },
  (table) => [
    index("call_sessions_agent_id_idx").on(table.agentId),
    index("call_sessions_started_at_idx").on(table.startedAt),
  ],
);
