import { describe, expect, it } from "vitest";

import { deriveCallOutcome, isProtectedCallOutcome } from "./call-outcome";
import { MAX_SUMMARY_CHARS, buildCallSummary } from "./call-summary";

describe("call summary and outcomes", () => {
  it("builds a short booking summary", () => {
    expect(buildCallSummary({ toolsUsed: ["booking"], outcome: "booked" })).toBe(
      "Caller booked an appointment.",
    );
  });

  it("truncates long summaries", () => {
    const summary = buildCallSummary({
      notes: ["x".repeat(400)],
    });
    expect(summary.length).toBeLessThanOrEqual(MAX_SUMMARY_CHARS);
    expect(summary.endsWith("…")).toBe(true);
  });

  it("derives outcomes from tools and duration", () => {
    expect(deriveCallOutcome({ toolsUsed: ["telegram_handoff"] })).toBe("handoff");
    expect(deriveCallOutcome({ toolsUsed: ["book_appointment"] })).toBe("booked");
    expect(deriveCallOutcome({ durationSec: 4 })).toBe("abandoned");
    expect(deriveCallOutcome({ durationSec: 40 })).toBe("completed");
  });

  it("protects rich outcomes from hangup overwrite", () => {
    expect(isProtectedCallOutcome("booked")).toBe(true);
    expect(isProtectedCallOutcome("handoff")).toBe(true);
    expect(isProtectedCallOutcome("completed")).toBe(false);
  });
});
