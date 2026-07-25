export type CatalogVoice = {
  id: string;
  name: string;
  gender: "female" | "male";
  description: string;
  language: "en" | "am";
};

export type EnglishVoice = CatalogVoice;

/** Curated Cartesia Sonic-3 English voices for the Voice menu. */
export const ENGLISH_VOICES: EnglishVoice[] = [
  {
    id: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    name: "Ashley",
    gender: "female",
    description: "Warm female",
    language: "en",
  },
  {
    id: "79a125e8-cd45-4c13-8a67-188112f4dd22",
    name: "British Lady",
    gender: "female",
    description: "Professional female",
    language: "en",
  },
  {
    id: "a0e99841-438c-4a64-b679-ae501ae7d955",
    name: "Barbershop Man",
    gender: "male",
    description: "Friendly male",
    language: "en",
  },
  {
    id: "34dbb662-8e98-413c-a1ef-1a3407675fe7",
    name: "Newsman",
    gender: "male",
    description: "Professional male",
    language: "en",
  },
  {
    id: "87748186-23bb-4158-a1eb-332911b0b708",
    name: "Brooke",
    gender: "female",
    description: "Clear female",
    language: "en",
  },
  {
    id: "5c5ad5e7-1020-476b-8b91-fdc0f1617837",
    name: "Southern Woman",
    gender: "female",
    description: "Casual female",
    language: "en",
  },
];
export const DEFAULT_ENGLISH_VOICE_ID = ENGLISH_VOICES[0]!.id;

/**
 * Snapshot of Addis Voices 2 Amharic IDs (docs catalog, Jul 2026).
 * Prefer refreshing via addis.voices.list({ language: "am" }) when the API key is present.
 */
export const AMHARIC_VOICES: CatalogVoice[] = [
  {
    id: "am-hamen",
    name: "Hamen",
    gender: "female",
    description: "Warm conversational",
    language: "am",
  },
  {
    id: "am-nejat",
    name: "Nejat",
    gender: "female",
    description: "Smooth measured",
    language: "am",
  },
  {
    id: "am-yohanes-calm",
    name: "Yohannes",
    gender: "male",
    description: "Low-key reflective",
    language: "am",
  },
  {
    id: "am-tesfa",
    name: "Tesfa",
    gender: "male",
    description: "Confident commercial",
    language: "am",
  },
  {
    id: "am-muaz",
    name: "Muaz",
    gender: "male",
    description: "Clear expressive",
    language: "am",
  },
  {
    id: "am-roba",
    name: "Roba",
    gender: "male",
    description: "Energetic bright",
    language: "am",
  },
];
export const DEFAULT_AMHARIC_VOICE_ID = AMHARIC_VOICES[0]!.id;

export function isKnownEnglishVoiceId(voiceId: string): boolean {
  return ENGLISH_VOICES.some((voice) => voice.id === voiceId);
}

export function isKnownAmharicVoiceId(voiceId: string): boolean {
  return AMHARIC_VOICES.some((voice) => voice.id === voiceId);
}

export function resolveEnglishVoiceId(voiceConfig?: Record<string, string> | null): string {
  const configured = voiceConfig?.en;
  if (configured && isKnownEnglishVoiceId(configured)) return configured;
  return DEFAULT_ENGLISH_VOICE_ID;
}

export function resolveAmharicVoiceId(voiceConfig?: Record<string, string> | null): string {
  const configured = voiceConfig?.am?.trim();
  if (configured && isKnownAmharicVoiceId(configured)) return configured;
  return DEFAULT_AMHARIC_VOICE_ID;
}

export function agentSupportsLanguage(
  agent: { primaryLanguage: string; additionalLanguages?: string[] | null },
  language: string,
): boolean {
  if (agent.primaryLanguage === language) return true;
  return (agent.additionalLanguages ?? []).includes(language);
}
