import type { BusinessHours } from "@solar-ai/db/schema/agent";
import { DateTime } from "luxon";

export type BookingTimeRange = { start: Date; end: Date };

const DAY_ALIASES: Record<string, string> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
};

function overlaps(a: BookingTimeRange, b: BookingTimeRange) {
  return a.start < b.end && a.end > b.start;
}

export function getBookingLockUnits(start: Date, end: Date, bufferMinutes = 0): Date[] {
  const units: Date[] = [];
  let cursor = DateTime.fromJSDate(start, { zone: "utc" }).startOf("minute");
  const remainder = cursor.minute % 15;
  if (remainder) cursor = cursor.minus({ minutes: remainder });
  const lockEnd = DateTime.fromJSDate(end, { zone: "utc" }).plus({ minutes: bufferMinutes });
  while (cursor < lockEnd) {
    units.push(cursor.toJSDate());
    cursor = cursor.plus({ minutes: 15 });
  }
  return units;
}

export function buildAvailableSlots(input: {
  date: string;
  timezone: string;
  hours: BusinessHours;
  durationMinutes: number;
  bufferMinutes: number;
  leadMinutes: number;
  blocked: BookingTimeRange[];
  occupiedUnitStarts: Date[];
  now?: Date;
}) {
  const localDate = DateTime.fromISO(input.date, { zone: input.timezone }).startOf("day");
  if (!localDate.isValid) return [];
  const fullDay = localDate.toFormat("cccc").toLowerCase();
  const dayHours = input.hours[fullDay] ?? input.hours[DAY_ALIASES[fullDay] ?? ""];
  if (!dayHours || dayHours.closed || !dayHours.open || !dayHours.close) return [];

  const [openHour, openMinute] = dayHours.open.split(":").map(Number);
  const [closeHour, closeMinute] = dayHours.close.split(":").map(Number);
  let cursor = localDate.set({ hour: openHour, minute: openMinute, second: 0, millisecond: 0 });
  const close = localDate.set({
    hour: closeHour,
    minute: closeMinute,
    second: 0,
    millisecond: 0,
  });
  const earliest = DateTime.fromJSDate(input.now ?? new Date())
    .setZone(input.timezone)
    .plus({ minutes: input.leadMinutes });
  const occupied = new Set(input.occupiedUnitStarts.map((date) => date.toISOString()));
  const slots: Array<{ start: Date; end: Date; localLabel: string }> = [];

  while (cursor.plus({ minutes: input.durationMinutes }) <= close) {
    const end = cursor.plus({ minutes: input.durationMinutes });
    const range = { start: cursor.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
    const isBlocked = input.blocked.some((block) => overlaps(range, block));
    const isOccupied = getBookingLockUnits(
      range.start,
      range.end,
      input.bufferMinutes,
    ).some((unit) => occupied.has(unit.toISOString()));
    if (cursor >= earliest && !isBlocked && !isOccupied) {
      slots.push({ ...range, localLabel: cursor.toFormat("cccc, LLLL d 'at' h:mm a") });
    }
    cursor = cursor.plus({ minutes: 15 });
  }
  return slots;
}
