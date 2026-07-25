import type { AgentService, BusinessHours } from "@solar-ai/db/schema/agent";
import { z } from "zod";

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dayHoursSchema = z
  .object({
    open: z.string().nullable(),
    close: z.string().nullable(),
    closed: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.closed) return;
    if (!value.open || !value.close) {
      ctx.addIssue({
        code: "custom",
        message: "Open and close times are required when the day is not closed",
      });
      return;
    }
    if (!timeRegex.test(value.open) || !timeRegex.test(value.close)) {
      ctx.addIssue({
        code: "custom",
        message: "Times must use HH:mm format",
      });
      return;
    }
    if (value.close <= value.open) {
      ctx.addIssue({
        code: "custom",
        message: "Close time must be after open time",
      });
    }
  });

export const businessHoursSchema = z
  .record(z.string(), dayHoursSchema)
  .superRefine((hours, ctx) => {
    for (const day of WEEKDAYS) {
      if (!(day in hours)) {
        ctx.addIssue({
          code: "custom",
          message: `Missing hours for ${day}`,
          path: [day],
        });
      }
    }
  });

export const serviceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  price: z.number().nonnegative(),
  currency: z.string().min(1).max(10),
  durationMinutes: z.number().int().min(15).max(480).multipleOf(15),
  bookable: z.boolean(),
});

export const servicesSchema = z.array(serviceSchema).max(20);

export function assertValidHours(hours: BusinessHours) {
  return businessHoursSchema.parse(hours);
}

export function assertValidServices(services: AgentService[]) {
  return servicesSchema.parse(services);
}
