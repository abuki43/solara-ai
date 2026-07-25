import type { BusinessHours } from "@solar-ai/db/schema/agent";
import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";

import { buildAvailableSlots, getBookingLockUnits } from "./booking-engine";

const hours: BusinessHours = {
  monday: { open: "09:00", close: "12:00", closed: false },
  tuesday: { open: null, close: null, closed: true },
};

describe("booking availability engine", () => {
  it("converts local business hours to exact UTC timestamps", () => {
    const slots = buildAvailableSlots({
      date: "2026-07-27",
      timezone: "Africa/Addis_Ababa",
      hours,
      durationMinutes: 30,
      bufferMinutes: 0,
      leadMinutes: 0,
      blocked: [],
      occupiedUnitStarts: [],
      now: DateTime.fromISO("2026-07-26T00:00:00Z").toJSDate(),
    });
    expect(slots[0]?.start.toISOString()).toBe("2026-07-27T06:00:00.000Z");
    expect(slots[0]?.localLabel).toContain("9:00 AM");
  });

  it("returns no candidates on a closed day", () => {
    expect(
      buildAvailableSlots({
        date: "2026-07-28",
        timezone: "Africa/Addis_Ababa",
        hours,
        durationMinutes: 30,
        bufferMinutes: 0,
        leadMinutes: 0,
        blocked: [],
        occupiedUnitStarts: [],
        now: new Date("2026-07-26T00:00:00Z"),
      }),
    ).toEqual([]);
  });

  it("applies lead time, variable duration, buffers, blocks, and occupancy", () => {
    const firstStart = new Date("2026-07-27T06:30:00.000Z");
    const slots = buildAvailableSlots({
      date: "2026-07-27",
      timezone: "Africa/Addis_Ababa",
      hours,
      durationMinutes: 45,
      bufferMinutes: 15,
      leadMinutes: 60,
      blocked: [
        {
          start: new Date("2026-07-27T07:30:00.000Z"),
          end: new Date("2026-07-27T08:00:00.000Z"),
        },
      ],
      occupiedUnitStarts: getBookingLockUnits(
        firstStart,
        new Date("2026-07-27T07:15:00.000Z"),
        15,
      ),
      now: new Date("2026-07-27T05:00:00.000Z"),
    });
    expect(slots.every((slot) => slot.start >= new Date("2026-07-27T06:00:00.000Z"))).toBe(true);
    expect(
      slots.some(
        (slot) =>
          slot.start < new Date("2026-07-27T08:00:00.000Z") &&
          slot.end > new Date("2026-07-27T07:30:00.000Z"),
      ),
    ).toBe(false);
    expect(slots.some((slot) => slot.start.toISOString() === firstStart.toISOString())).toBe(false);
  });

  it("claims every 15-minute unit including configured buffer", () => {
    expect(
      getBookingLockUnits(
        new Date("2026-07-27T06:00:00Z"),
        new Date("2026-07-27T06:30:00Z"),
        15,
      ).map((date) => date.toISOString()),
    ).toEqual([
      "2026-07-27T06:00:00.000Z",
      "2026-07-27T06:15:00.000Z",
      "2026-07-27T06:30:00.000Z",
    ]);
  });
});
