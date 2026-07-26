import AddisAI from "addisai";

let cached: AddisAI | null = null;

export function getAddisClient(): AddisAI {
  const apiKey = process.env.ADDIS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ADDIS_API_KEY is required for Amharic calls");
  }
  if (!cached) {
    // Keep retries low for live turns: long Retry-After waits leave audioTranscript empty.
    cached = new AddisAI({
      apiKey,
      timeout: 25_000,
      maxRetries: 1,
      logLevel: "warn",
    });
  }
  return cached;
}

export function isAddisAmharicRuntimeEnabled(): boolean {
  return process.env.ADDIS_AMHARIC_ENABLED === "true" && Boolean(process.env.ADDIS_API_KEY?.trim());
}
