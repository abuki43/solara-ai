export type EnglishVoice = {
  id: string;
  name: string;
  gender: "female" | "male";
  description: string;
};

/** Curated Cartesia Sonic-3 English voices for the Voice menu. */
export const ENGLISH_VOICES: EnglishVoice[] = [
  {
    id: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    name: "Ashley",
    gender: "female",
    description: "Warm female",
  },
  {
    id: "79a125e8-cd45-4c13-8a67-188112f4dd22",
    name: "British Lady",
    gender: "female",
    description: "Professional female",
  },
  {
    id: "a0e99841-438c-4a64-b679-ae501ae7d955",
    name: "Barbershop Man",
    gender: "male",
    description: "Friendly male",
  },
  {
    id: "34dbb662-8e98-413c-a1ef-1a3407675fe7",
    name: "Newsman",
    gender: "male",
    description: "Professional male",
  },
  {
    id: "87748186-23bb-4158-a1eb-332911b0b708",
    name: "Brooke",
    gender: "female",
    description: "Clear female",
  },
  {
    id: "5c5ad5e7-1020-476b-8b91-fdc0f1617837",
    name: "Southern Woman",
    gender: "female",
    description: "Casual female",
  },
];
export const DEFAULT_ENGLISH_VOICE_ID = ENGLISH_VOICES[0]!.id;

export function isKnownEnglishVoiceId(voiceId: string): boolean {
  return ENGLISH_VOICES.some((voice) => voice.id === voiceId);
}

export function resolveEnglishVoiceId(voiceConfig?: Record<string, string> | null): string {
  const configured = voiceConfig?.en;
  if (configured && isKnownEnglishVoiceId(configured)) return configured;
  return DEFAULT_ENGLISH_VOICE_ID;
}
