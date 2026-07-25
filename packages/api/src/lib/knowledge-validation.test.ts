import { describe, expect, it } from "vitest";

import { businessHoursSchema, servicesSchema } from "./knowledge-validation";

describe("knowledge validation", () => {
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
