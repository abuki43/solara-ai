import AddisAI from "addisai";

/** Shared Addis client for server-side voice catalog + preview. */
export function createAddisClient(apiKey = process.env.ADDIS_API_KEY) {
  if (!apiKey) {
    throw new Error("ADDIS_API_KEY is not configured");
  }
  return new AddisAI({ apiKey });
}

export function isAddisAmharicEnabled(): boolean {
  return (
    process.env.ADDIS_AMHARIC_ENABLED === "true" && Boolean(process.env.ADDIS_API_KEY?.trim())
  );
}
