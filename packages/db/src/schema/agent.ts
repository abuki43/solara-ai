import { relations } from "drizzle-orm";
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

import { organizations } from "./organization";

export const agentStatusEnum = pgEnum("agent_status", ["draft", "active", "paused"]);
export const useCaseEnum = pgEnum("use_case", ["salon", "clinic", "restaurant", "general"]);
export const languageEnum = pgEnum("language", ["en", "am", "om"]);
export const toneEnum = pgEnum("tone", ["friendly", "professional", "casual"]);

export type BusinessHours = Record<
  string,
  { open: string | null; close: string | null; closed: boolean }
>;

export type AgentService = {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationMinutes: number;
  bookable: boolean;
};

export type VoiceConfig = Record<string, string>;

export const agents = pgTable(
  "agents",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    useCase: useCaseEnum("use_case").notNull().default("general"),
    status: agentStatusEnum("status").notNull().default("draft"),
    primaryLanguage: languageEnum("primary_language").notNull().default("en"),
    additionalLanguages: jsonb("additional_languages").$type<string[]>().notNull(),
    voiceConfig: jsonb("voice_config").$type<VoiceConfig>().notNull(),
    greeting: text("greeting"),
    tone: toneEnum("tone").notNull().default("friendly"),
    businessName: text("business_name"),
    hours: jsonb("hours").$type<BusinessHours>().notNull(),
    services: jsonb("services").$type<AgentService[]>().notNull(),
    aboutText: text("about_text"),
    customInstructions: text("custom_instructions"),
    widgetButtonLabel: text("widget_button_label").notNull().default("Start Call"),
    widgetAccentColor: text("widget_accent_color").notNull().default("#7cf0ff"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("agents_slug_idx").on(table.slug),
    index("agents_organizationId_idx").on(table.organizationId),
  ],
);

export const agentsRelations = relations(agents, ({ one }) => ({
  organization: one(organizations, {
    fields: [agents.organizationId],
    references: [organizations.id],
  }),
}));
