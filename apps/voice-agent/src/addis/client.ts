import AddisAI from "addisai";

let cached: AddisAI | null = null;

export function getAddisClient(): AddisAI {
  const apiKey = process.env.ADDIS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ADDIS_API_KEY is required for Amharic calls");
  }
  if (!cached) {
    cached = new AddisAI({ apiKey });
  }
  return cached;
}

export function isAddisAmharicRuntimeEnabled(): boolean {
  return process.env.ADDIS_AMHARIC_ENABLED === "true" && Boolean(process.env.ADDIS_API_KEY?.trim());
}
