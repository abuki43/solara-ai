import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

import { user } from "./auth";

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("My Business"),
    phone: text("phone"),
    website: text("website"),
    address: text("address"),
    timezone: text("timezone").notNull().default("Africa/Addis_Ababa"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("organizations_userId_idx").on(table.userId)],
);

export const organizationsRelations = relations(organizations, ({ one }) => ({
  user: one(user, {
    fields: [organizations.userId],
    references: [user.id],
  }),
}));
