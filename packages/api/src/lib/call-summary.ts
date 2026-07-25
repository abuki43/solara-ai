const MAX_SUMMARY_CHARS = 300;

export function buildCallSummary(input: {
  toolsUsed?: string[];
  outcome?: string;
  notes?: string[];
}): string {
  const tools = input.toolsUsed ?? [];
  const parts: string[] = [];

  if (tools.includes("handoff") || tools.includes("telegram_handoff") || input.outcome === "handoff") {
    parts.push("Handoff requested. Staff notified via Telegram.");
  } else if (
    tools.includes("booking") ||
    tools.includes("book_appointment") ||
    input.outcome === "booked"
  ) {
    parts.push("Caller booked an appointment.");
  } else if (input.outcome === "abandoned") {
    parts.push("Call ended quickly with no completed action.");
  } else if (input.outcome === "failed") {
    parts.push("Call failed before completion.");
  } else {
    parts.push("Caller spoke with the AI receptionist.");
  }

  for (const note of input.notes ?? []) {
    const trimmed = note.trim();
    if (trimmed) parts.push(trimmed);
  }

  const summary = parts.join(" ").replace(/\s+/g, " ").trim();
  if (summary.length <= MAX_SUMMARY_CHARS) return summary;
  return `${summary.slice(0, MAX_SUMMARY_CHARS - 1).trimEnd()}…`;
}

export { MAX_SUMMARY_CHARS };
