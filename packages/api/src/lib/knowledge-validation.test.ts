import { describe, expect, it } from "vitest";

import { businessHoursSchema, normalizeBusinessHours, servicesSchema } from "./knowledge-validation";

describe("knowledge validation", () => {
  it("normalizes abbreviated day keys to full weekday names", () => {
    expect(
      normalizeBusinessHours({
        mon: { open: "09:00", close: "19:00", closed: false },
        tue: { open: "09:00", close: "19:00", closed: false },
        wed: { open: "09:00", close: "19:00", closed: false },
        thu: { open: "09:00", close: "19:00", closed: false },
        fri: { open: "09:00", close: "19:00", closed: false },
        sat: { open: "09:00", close: "19:00", closed: false },
        sun: { open: null, close: null, closed: true },
      }),
    ).toEqual({
      monday: { open: "09:00", close: "19:00", closed: false },
      tuesday: { open: "09:00", close: "19:00", closed: false },
      wednesday: { open: "09:00", close: "19:00", closed: false },
      thursday: { open: "09:00", close: "19:00", closed: false },
      friday: { open: "09:00", close: "19:00", closed: false },
      saturday: { open: "09:00", close: "19:00", closed: false },
      sunday: { open: null, close: null, closed: true },
    });
  });

  it("rejects close time before open time", () => {
    const result = businessHoursSchema.safeParse({
      monday: { open: "18:00", close: "09:00", closed: false },
      tuesday: { open: "09:00", close: "17:00", closed: false },
      wednesday: { open: "09:00", close: "17:00", closed: false },
      thursday: { open: "09:00", close: "17:00", closed: false },
      friday: { open: "09:00", close: "17:00", closed: false },
      saturday: { open: null, close: null, closed: true },
      sunday: { open: null, close: null, closed: true },
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 services", () => {
    const services = Array.from({ length: 21 }, (_, index) => ({
      id: `svc_${index}`,
      name: `Service ${index}`,
      price: 100,
      currency: "ETB",
      durationMinutes: 30,
      bookable: true,
    }));
    expect(servicesSchema.safeParse(services).success).toBe(false);
  });
});
