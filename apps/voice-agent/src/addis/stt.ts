import {
  type AudioBuffer,
  mergeFrames,
  normalizeLanguage,
  stt,
} from "@livekit/agents";
import type { AudioFrame } from "@livekit/rtc-node";

import { getAddisClient } from "./client.ts";
import { framesToWav } from "./wav.ts";

export class AddisSTT extends stt.STT {
  label = "addis.STT";
  private readonly languageCode = normalizeLanguage("am");
  private readonly language: "am";

  constructor(language: "am" = "am") {
    super({ streaming: true, interimResults: false });
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
    return new AddisSpeechStream(this, this.language);
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

    const wav = framesToWav(frames);
    const file = new File([wav], "utterance.wav", { type: "audio/wav" });
    const result = await getAddisClient().speech.transcribe({
      audio: file,
      language: this.language,
    });

    const durationSec =
      mergeFrames(frames).samplesPerChannel / (frames[0]?.sampleRate || 16_000);

    return {
      type: stt.SpeechEventType.FINAL_TRANSCRIPT,
      alternatives: [
        {
          language: this.languageCode,
          text: result.text?.trim() ?? "",
          startTime: 0,
          endTime: durationSec,
          confidence: result.confidence ?? 0.9,
        },
      ],
    };
  }
}

class AddisSpeechStream extends stt.SpeechStream {
  label = "addis.SpeechStream";
  private frames: AudioFrame[] = [];
  private readonly addisStt: AddisSTT;

  constructor(addisStt: AddisSTT, _language: "am") {
    super(addisStt);
    this.addisStt = addisStt;
  }

  protected async run(): Promise<void> {
    for await (const data of this.input) {
      if (data === stt.SpeechStream.FLUSH_SENTINEL) {
        await this.emitTranscript();
        continue;
      }
      this.frames.push(data);
    }
    await this.emitTranscript();
  }

  private async emitTranscript() {
    if (!this.frames.length) return;
    const batch = this.frames;
    this.frames = [];
    try {
      const event = await this.addisStt.transcribeFrames(batch);
      if (event.alternatives?.[0]?.text) {
        this.queue.put({ type: stt.SpeechEventType.START_OF_SPEECH });
        this.queue.put(event);
        this.queue.put({
          type: stt.SpeechEventType.END_OF_SPEECH,
          alternatives: event.alternatives,
        });
      }
    } catch (error) {
      console.error("[addis.STT] transcription failed", error);
    }
  }
}
