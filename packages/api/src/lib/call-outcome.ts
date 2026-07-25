/** Display outcomes used by the Calls menu. */
export const CALL_DISPLAY_OUTCOMES = [
  "started",
  "completed",
  "booked",
  "handoff",
  "abandoned",
  "failed",
] as const;

export type CallDisplayOutcome = (typeof CALL_DISPLAY_OUTCOMES)[number];

const RICH_OUTCOMES = new Set<CallDisplayOutcome>(["booked", "handoff", "failed"]);

/** Outcomes that should not be overwritten by a plain client hangup. */
export function isProtectedCallOutcome(outcome: string): boolean {
  return RICH_OUTCOMES.has(outcome as CallDisplayOutcome) || outcome === "abandoned";
}

export function mapBookingOutcome(
  event: "confirmed" | "cancelled" | "rescheduled",
): CallDisplayOutcome {
  if (event === "confirmed" || event === "rescheduled") return "booked";
  return "completed";
}

export function deriveCallOutcome(input: {
  toolsUsed?: string[];
  durationSec?: number | null;
  failed?: boolean;
}): CallDisplayOutcome {
  if (input.failed) return "failed";
  const tools = input.toolsUsed ?? [];
  if (tools.includes("handoff") || tools.includes("telegram_handoff")) return "handoff";
  if (tools.includes("booking") || tools.includes("book_appointment")) return "booked";
  if (typeof input.durationSec === "number" && input.durationSec < 10) return "abandoned";
  return "completed";
}
