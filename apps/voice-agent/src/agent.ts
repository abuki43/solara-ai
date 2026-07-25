import { Agent, inference, llm } from "@livekit/agents";
import { z } from "zod";

import { AddisLLM } from "./addis/llm.ts";

export type HandoffRequest = {
  callerName: string;
  callerContact: string;
  reason: string;
  consentGiven: true;
};

export type AvailabilityRequest = {
  serviceName: string;
  date: string;
};

export type BookingRequest = {
  serviceName: string;
  startTime: string;
  callerName: string;
  callerContact: string;
  consentGiven: true;
};

export type BookingLookupRequest = {
  confirmationCode: string;
  callerContact: string;
};

export type BookingCancelRequest = BookingLookupRequest & {
  reason: string;
  confirmed: true;
};

export type BookingRescheduleRequest = BookingLookupRequest & {
  startTime: string;
  confirmed: true;
};

export type EndCallRequest = {
  confirmed: true;
};

export function createAgent(
  instructions: string,
  requestHandoff?: (input: HandoffRequest) => Promise<string>,
  checkAvailability?: (input: AvailabilityRequest) => Promise<string>,
  bookAppointment?: (input: BookingRequest) => Promise<string>,
  lookupBooking?: (input: BookingLookupRequest) => Promise<string>,
  cancelBooking?: (input: BookingCancelRequest) => Promise<string>,
  rescheduleBooking?: (input: BookingRescheduleRequest) => Promise<string>,
  endCall?: (input: EndCallRequest) => Promise<string>,
  options?: { language?: "en" | "am" },
) {
  const language = options?.language ?? "en";
  const tools = {
    ...(requestHandoff
      ? {
        request_handoff: llm.tool({
          description:
            "Send a human follow-up request to the business through Telegram. Use only after the caller explicitly consents and confirms their name, contact, and reason.",
          parameters: z.object({
            callerName: z.string().min(1).describe("Caller's confirmed name"),
            callerContact: z
              .string()
              .min(3)
              .describe("Caller's confirmed phone number or Telegram contact"),
            reason: z.string().min(3).describe("Concise reason the business should follow up"),
            consentGiven: z
              .literal(true)
              .describe("True only after the caller explicitly permits sharing these details"),
          }),
          execute: async (input) => requestHandoff(input),
        }),
        }
      : {}),
    ...(checkAvailability
      ? {
          check_availability: llm.tool({
            description:
              "Check real appointment availability for a bookable service on a specific local calendar date. Always call this before offering times.",
            parameters: z.object({
              serviceName: z.string().min(1).describe("Service name from the business service list"),
              date: z
                .string()
                .min(1)
                .describe(
                  "Requested local date. YYYY-MM-DD is preferred; today, tomorrow, weekday names, and phrases like July 28 are also accepted.",
                ),
            }),
            execute: async (input) => checkAvailability(input),
          }),
        }
      : {}),
    ...(bookAppointment
      ? {
          book_appointment: llm.tool({
            description:
              "Confirm an appointment in the booking database. Use an exact startTime returned by check_availability and only after the caller confirms all details and consents.",
            parameters: z.object({
              serviceName: z.string().min(1),
              startTime: z.string().datetime({ offset: true }),
              callerName: z.string().min(1),
              callerContact: z.string().min(3),
              consentGiven: z.literal(true),
            }),
            execute: async (input) => bookAppointment(input),
          }),
        }
      : {}),
    ...(lookupBooking
      ? {
          lookup_booking: llm.tool({
            description:
              "Look up an existing booking only after collecting both its confirmation code and the exact caller contact used to book.",
            parameters: z.object({
              confirmationCode: z.string().min(6),
              callerContact: z.string().min(3),
            }),
            execute: async (input) => lookupBooking(input),
          }),
        }
      : {}),
    ...(cancelBooking
      ? {
          cancel_booking: llm.tool({
            description:
              "Cancel a verified booking only after lookup succeeds and the caller explicitly confirms cancellation. Confirm verbally only after this tool succeeds.",
            parameters: z.object({
              confirmationCode: z.string().min(6),
              callerContact: z.string().min(3),
              reason: z.string().min(1),
              confirmed: z.literal(true),
            }),
            execute: async (input) => cancelBooking(input),
          }),
        }
      : {}),
    ...(rescheduleBooking
      ? {
          reschedule_booking: llm.tool({
            description:
              "Move a verified booking to an exact time returned by check_availability. Use only after the caller explicitly confirms the change. Confirm verbally only after this tool succeeds.",
            parameters: z.object({
              confirmationCode: z.string().min(6),
              callerContact: z.string().min(3),
              startTime: z.string().datetime({ offset: true }),
              confirmed: z.literal(true),
            }),
            execute: async (input) => rescheduleBooking(input),
          }),
        }
      : {}),
    ...(endCall
      ? {
          end_call: llm.tool({
            description:
              "End the call after the caller confirms they need nothing else. Give a brief warm goodbye first, then call this tool once.",
            parameters: z.object({
              confirmed: z
                .literal(true)
                .describe(
                  "True only after the caller explicitly says they are done, have no more questions, or goodbye",
                ),
            }),
            execute: async (input) => endCall(input),
          }),
        }
      : {}),
  };

  return Agent.create({
    instructions,
    llm:
      language === "am"
        ? new AddisLLM()
        : new inference.LLM({ model: "google/gemini-2.5-flash-lite" }),
    tools,
  });
}
