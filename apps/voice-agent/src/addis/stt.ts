import { type AudioBuffer, normalizeLanguage, stt } from "@livekit/agents";
import type { AudioFrame } from "@livekit/rtc-node";

import { getAddisClient } from "./client.ts";
import { framesToAddisSttWav } from "./wav.ts";

/**
 * Batch (file) Addis STT. Must stay non-streaming so LiveKit wraps it with
 * StreamAdapter and calls recognize() on each VAD speech segment.
 */
export class AddisSTT extends stt.STT {
  label = "addis.STT";
  private readonly languageCode = normalizeLanguage("am");
  private readonly language: "am";

  constructor(language: "am" = "am") {
    super({ streaming: false, interimResults: false });
    this.language = language;
  }

  get model(): string {
    return "addis-whisper";
  }

  get provider(): string {
    return "addisassistant.com";
  }

  protected async _recognize(frame: AudioBuffer): Promise<stt.SpeechEvent> {
    const frames = Array.isArray(frame) ? frame : [frame];
    return this.transcribeFrames(frames);
  }

  stream(): stt.SpeechStream {
    // LiveKit never calls this when streaming:false — it uses STTStreamAdapter.
    throw new Error("AddisSTT is non-streaming; use LiveKit StreamAdapter via AgentSession");
  }

  async transcribeFrames(frames: AudioFrame[]): Promise<stt.SpeechEvent> {
    if (!frames.length) {
      return {
        type: stt.SpeechEventType.FINAL_TRANSCRIPT,
        alternatives: [
          {
            language: this.languageCode,
            text: "",
            startTime: 0,
            endTime: 0,
            confidence: 0,
          },
        ],
      };
    }

    const encoded = framesToAddisSttWav(frames);
    console.info("[addis.STT] transcribing", {
      frames: frames.length,
      sampleRate: encoded.sampleRate,
      durationSec: Number(encoded.durationSec.toFixed(2)),
      byteLength: encoded.byteLength,
    });

    const result = await getAddisClient().speech.transcribe({
      audio: {
        data: encoded.wav,
        filename: "utterance.wav",
        contentType: "audio/wav",
      },
      language: this.language,
    });

    const text = result.text?.trim() ?? "";
    console.info("[addis.STT] result", {
      textLength: text.length,
      textPreview: text.slice(0, 80),
      confidence: result.confidence,
    });

    return {
      type: stt.SpeechEventType.FINAL_TRANSCRIPT,
      alternatives: [
        {
          language: this.languageCode,
          text,
          startTime: 0,
          endTime: encoded.durationSec,
          confidence: result.confidence ?? 0.9,
        },
      ],
    };
  }
}
