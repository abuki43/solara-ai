import {
  AudioByteStream,
  type APIConnectOptions,
  shortuuid,
  tts,
} from "@livekit/agents";
import { randomUUID } from "node:crypto";

import { getAddisClient } from "./client.ts";
import { wavToPcm16 } from "./wav.ts";

const SAMPLE_RATE = 16_000;
const NUM_CHANNELS = 1;

export class AddisTTS extends tts.TTS {
  label = "addis.TTS";
  private abortController = new AbortController();
  private readonly voiceId: string;

  constructor(voiceId: string) {
    super(SAMPLE_RATE, NUM_CHANNELS, { streaming: false });
    this.voiceId = voiceId;
  }

  get model(): string {
    return "addis-voices-2";
  }

  get provider(): string {
    return "addisassistant.com";
  }

  synthesize(
    text: string,
    connOptions?: APIConnectOptions,
    abortSignal?: AbortSignal,
  ): tts.ChunkedStream {
    const signal = abortSignal
      ? AbortSignal.any([abortSignal, this.abortController.signal])
      : this.abortController.signal;
    return new AddisChunkedStream(this, text, this.voiceId, connOptions, signal);
  }

  stream(): tts.SynthesizeStream {
    throw new Error("Streaming TTS is not supported for Addis Voices 2; use synthesize()");
  }

  async close(): Promise<void> {
    this.abortController.abort();
  }
}

class AddisChunkedStream extends tts.ChunkedStream {
  label = "addis.ChunkedStream";
  private readonly voiceId: string;

  constructor(
    ttsInstance: AddisTTS,
    text: string,
    voiceId: string,
    connOptions?: APIConnectOptions,
    abortSignal?: AbortSignal,
  ) {
    super(text, ttsInstance, connOptions, abortSignal);
    this.voiceId = voiceId;
  }

  protected async run(): Promise<void> {
    try {
      const clip = await getAddisClient().voice.generate({
        text: this.inputText,
        voiceId: this.voiceId,
        language: "am",
        outputFormat: "pcm_16000",
        clientRequestId: randomUUID(),
      });
      const audio = await clip.arrayBuffer();
      const { pcm, sampleRate } = wavToPcm16(audio);
      const requestId = shortuuid();
      const byteStream = new AudioByteStream(sampleRate || SAMPLE_RATE, NUM_CHANNELS);
      const frames = byteStream.write(pcm);

      let lastFrame = frames[frames.length - 1];
      for (let i = 0; i < frames.length - 1; i++) {
        const frame = frames[i];
        if (!frame) continue;
        this.queue.put({
          requestId,
          segmentId: requestId,
          frame,
          final: false,
        });
      }
      if (lastFrame) {
        this.queue.put({
          requestId,
          segmentId: requestId,
          frame: lastFrame,
          final: true,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      throw error;
    } finally {
      this.queue.close();
    }
  }
}
