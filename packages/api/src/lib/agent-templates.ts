import type { AgentService, BusinessHours } from "@solar-ai/db/schema/agent";

export type UseCase = "salon" | "clinic" | "restaurant" | "general";

const defaultWeekdayHours: BusinessHours = {
  mon: { open: "09:00", close: "19:00", closed: false },
  tue: { open: "09:00", close: "19:00", closed: false },
  wed: { open: "09:00", close: "19:00", closed: false },
  thu: { open: "09:00", close: "19:00", closed: false },
  fri: { open: "09:00", close: "19:00", closed: false },
  sat: { open: "09:00", close: "19:00", closed: false },
  sun: { open: null, close: null, closed: true },
};

const clinicHours: BusinessHours = {
  ...defaultWeekdayHours,
  sat: { open: "09:00", close: "13:00", closed: false },
  sun: { open: null, close: null, closed: true },
};

const restaurantHours: BusinessHours = {
  mon: { open: "11:00", close: "22:00", closed: false },
  tue: { open: "11:00", close: "22:00", closed: false },
  wed: { open: "11:00", close: "22:00", closed: false },
  thu: { open: "11:00", close: "22:00", closed: false },
  fri: { open: "11:00", close: "22:00", closed: false },
  sat: { open: "11:00", close: "22:00", closed: false },
  sun: { open: "11:00", close: "22:00", closed: false },
};

const officeHours: BusinessHours = {
  mon: { open: "09:00", close: "17:00", closed: false },
  tue: { open: "09:00", close: "17:00", closed: false },
  wed: { open: "09:00", close: "17:00", closed: false },
  thu: { open: "09:00", close: "17:00", closed: false },
  fri: { open: "09:00", close: "17:00", closed: false },
  sat: { open: null, close: null, closed: true },
  sun: { open: null, close: null, closed: true },
};

function service(
  name: string,
  price: number,
  durationMinutes: number,
  bookable = true,
): AgentService {
  return {
    id: crypto.randomUUID(),
    name,
    price,
    currency: "ETB",
    durationMinutes,
    bookable,
  };
}

export const USE_CASE_TEMPLATES: Record<
  UseCase,
  { hours: BusinessHours; services: AgentService[]; greeting: (businessName: string) => string }
> = {
  salon: {
    hours: defaultWeekdayHours,
    services: [
      service("Haircut", 200, 30),
      service("Hair Color", 500, 90),
      service("Manicure", 150, 45),
    ],
    greeting: (businessName) =>
      `Hello, thank you for calling ${businessName}. How can I help you today?`,
  },
  clinic: {
    hours: clinicHours,
    services: [
      service("Consultation", 300, 30),
      service("Follow-up Visit", 150, 20),
    ],
    greeting: (businessName) =>
      `Hello, you've reached ${businessName}. How may I assist you?`,
  },
  restaurant: {
    hours: restaurantHours,
    services: [service("Table Reservation", 0, 90)],
    greeting: (businessName) =>
      `Hello, welcome to ${businessName}. Are you calling to book a table?`,
  },
  general: {
    hours: officeHours,
    services: [service("General Inquiry", 0, 15, false)],
    greeting: (businessName) =>
      `Hello, thank you for calling ${businessName}. How can I help?`,
  },
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
