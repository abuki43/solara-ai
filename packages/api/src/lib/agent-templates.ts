import type { AgentService, BusinessHours } from "@solar-ai/db/schema/agent";

export type UseCase = "salon" | "clinic" | "restaurant" | "general";

const defaultWeekdayHours: BusinessHours = {
  monday: { open: "09:00", close: "19:00", closed: false },
  tuesday: { open: "09:00", close: "19:00", closed: false },
  wednesday: { open: "09:00", close: "19:00", closed: false },
  thursday: { open: "09:00", close: "19:00", closed: false },
  friday: { open: "09:00", close: "19:00", closed: false },
  saturday: { open: "09:00", close: "19:00", closed: false },
  sunday: { open: null, close: null, closed: true },
};

const clinicHours: BusinessHours = {
  ...defaultWeekdayHours,
  saturday: { open: "09:00", close: "13:00", closed: false },
  sunday: { open: null, close: null, closed: true },
};

const restaurantHours: BusinessHours = {
  monday: { open: "11:00", close: "22:00", closed: false },
  tuesday: { open: "11:00", close: "22:00", closed: false },
  wednesday: { open: "11:00", close: "22:00", closed: false },
  thursday: { open: "11:00", close: "22:00", closed: false },
  friday: { open: "11:00", close: "22:00", closed: false },
  saturday: { open: "11:00", close: "22:00", closed: false },
  sunday: { open: "11:00", close: "22:00", closed: false },
};

const officeHours: BusinessHours = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: null, close: null, closed: true },
  sunday: { open: null, close: null, closed: true },
};

export function buildDefaultGreeting(businessName: string): string {
  return `Thank you for calling ${businessName}. You've reached our customer support. I'm an AI assistant here to help — how can I help you today?`;
}

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
      `Thank you for calling ${businessName}. You've reached our customer support. I'm an AI assistant and I can help with hours, services, prices, or booking. How can I help you today?`,
  },
  clinic: {
    hours: clinicHours,
    services: [
      service("Consultation", 300, 30),
      service("Follow-up Visit", 150, 20),
    ],
    greeting: (businessName) =>
      `Thank you for calling ${businessName}. You've reached our front desk support. I'm an AI assistant and I can help with hours, services, or appointments. How can I help you today?`,
  },
  restaurant: {
    hours: restaurantHours,
    services: [service("Table Reservation", 0, 90)],
    greeting: (businessName) =>
      `Thank you for calling ${businessName}. You've reached our customer support. I'm an AI assistant — are you calling to reserve a table or ask a question?`,
  },
  general: {
    hours: officeHours,
    services: [service("General Inquiry", 0, 15, false)],
    greeting: buildDefaultGreeting,
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
