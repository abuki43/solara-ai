ALTER TABLE "bookings" ALTER COLUMN "slot_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_slot_id_unique";
--> statement-breakpoint
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_slot_id_availability_slots_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_slot_id_availability_slots_id_fk"
  FOREIGN KEY ("slot_id") REFERENCES "availability_slots"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "confirmation_code" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancellation_reason" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "rescheduled_from_id" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "owner_notes" text;
--> statement-breakpoint
UPDATE "bookings"
SET "confirmation_code" = upper(substr(md5("id"), 1, 8))
WHERE "confirmation_code" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_confirmation_code_unique"
  ON "bookings" ("confirmation_code");
--> statement-breakpoint
ALTER TABLE "agent_tools"
  ADD COLUMN IF NOT EXISTS "booking_cancellation_notifications_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "agent_tools"
  ADD COLUMN IF NOT EXISTS "booking_reschedule_notifications_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "agent_tools"
  ADD COLUMN IF NOT EXISTS "booking_lead_minutes" integer DEFAULT 60 NOT NULL;
ALTER TABLE "agent_tools"
  ADD COLUMN IF NOT EXISTS "booking_window_days" integer DEFAULT 14 NOT NULL;
ALTER TABLE "agent_tools"
  ADD COLUMN IF NOT EXISTS "booking_buffer_minutes" integer DEFAULT 0 NOT NULL;
ALTER TABLE "agent_tools"
  ADD COLUMN IF NOT EXISTS "booking_service_ids" jsonb;
--> statement-breakpoint
ALTER TABLE "call_sessions" ADD COLUMN IF NOT EXISTS "booking_id" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_blocked_times" (
  "id" text PRIMARY KEY NOT NULL,
  "agent_id" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "reason" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "booking_blocked_times_valid_range" CHECK ("ends_at" > "starts_at")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_blocked_times_agent_start_idx"
  ON "booking_blocked_times" ("agent_id", "starts_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_slot_locks" (
  "id" text PRIMARY KEY NOT NULL,
  "booking_id" text NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
  "agent_id" text NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "unit_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "booking_slot_locks_agent_unit_idx"
  ON "booking_slot_locks" ("agent_id", "unit_start");
CREATE INDEX IF NOT EXISTS "booking_slot_locks_booking_id_idx"
  ON "booking_slot_locks" ("booking_id");
--> statement-breakpoint
INSERT INTO "booking_slot_locks" ("id", "booking_id", "agent_id", "unit_start")
SELECT
  b."id" || ':' || extract(epoch FROM unit)::bigint,
  b."id",
  b."agent_id",
  unit
FROM "bookings" b
LEFT JOIN "agent_tools" tools ON tools."agent_id" = b."agent_id"
CROSS JOIN LATERAL generate_series(
  date_trunc('hour', b."start_time")
    + floor(extract(minute FROM b."start_time") / 15) * interval '15 minutes',
  b."end_time" + coalesce(tools."booking_buffer_minutes", 0) * interval '1 minute'
    - interval '1 microsecond',
  interval '15 minutes'
) unit
WHERE b."status" = 'confirmed'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DROP INDEX IF EXISTS "availability_slots_agent_start_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "availability_slots_agent_service_start_idx"
  ON "availability_slots" ("agent_id", "service_id", "start_time");
