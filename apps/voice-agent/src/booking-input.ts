import { DateTime } from "luxon";

const DAY_NAMES: Record<string, number> = {
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
  sunday: 7,
  sun: 7,
};

export function normalizeServiceName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function resolveBookingDate(input: string, timezone: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch?.[1]) {
    const date = DateTime.fromISO(isoMatch[1], { zone: timezone }).startOf("day");
    const iso = date.isValid ? date.toISODate() : null;
    if (iso) return iso;
  }

  const now = DateTime.now().setZone(timezone).startOf("day");
  const nowIso = now.toISODate();
  if (!nowIso) return null;
  const lower = raw.toLowerCase();
  const dayToken = lower.replace(/^next\s+/, "").replace(/[^a-z]/g, "");

  if (lower === "today") return nowIso;
  if (lower === "tomorrow") return now.plus({ days: 1 }).toISODate();

  const weekday = DAY_NAMES[dayToken];
  if (weekday) {
    let cursor = now;
    for (let step = 0; step < 14; step += 1) {
      if (cursor.weekday === weekday) return cursor.toISODate();
      cursor = cursor.plus({ days: 1 });
    }
  }

  const parsed = DateTime.fromFormat(lower, "LLLL d", { zone: timezone });
  if (parsed.isValid) {
    let candidate = parsed.set({ year: now.year });
    if (candidate < now) candidate = candidate.plus({ years: 1 });
    return candidate.startOf("day").toISODate();
  }

  const parsedShort = DateTime.fromFormat(lower, "LLL d", { zone: timezone });
  if (parsedShort.isValid) {
    let candidate = parsedShort.set({ year: now.year });
    if (candidate < now) candidate = candidate.plus({ years: 1 });
    return candidate.startOf("day").toISODate();
  }

  const loose = DateTime.fromISO(raw, { zone: timezone });
  if (loose.isValid) return loose.startOf("day").toISODate();

  return null;
}
