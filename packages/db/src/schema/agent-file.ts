import { relations } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { agents } from "./agent";

export const fileParseStatusEnum = pgEnum("file_parse_status", [
  "pending",
  "parsed",
  "failed",
]);

export const agentFiles = pgTable(
  "agent_files",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storagePath: text("storage_path").notNull(),
    extractedText: text("extracted_text"),
    parseStatus: fileParseStatusEnum("parse_status").notNull().default("pending"),
    parseError: text("parse_error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("agent_files_agentId_idx").on(table.agentId)],
);

export const agentFilesRelations = relations(agentFiles, ({ one }) => ({
  agent: one(agents, {
    fields: [agentFiles.agentId],
    references: [agents.id],
  }),
}));
