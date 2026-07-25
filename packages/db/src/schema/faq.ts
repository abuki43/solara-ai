import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { agents } from "./agent";

export const agentFaqs = pgTable(
  "agent_faqs",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("agent_faqs_agentId_idx").on(table.agentId),
    index("agent_faqs_agentId_sort_idx").on(table.agentId, table.sortOrder),
  ],
);

export const agentFaqsRelations = relations(agentFaqs, ({ one }) => ({
  agent: one(agents, {
    fields: [agentFaqs.agentId],
    references: [agents.id],
  }),
}));
