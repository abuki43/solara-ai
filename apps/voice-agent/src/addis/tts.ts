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

function splitIntoClauses(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Split on Ge'ez full stop (።), question mark (?), exclamation (!), standard period (.), or newline
  const parts = trimmed.split(/(?<=[።?!.\n])\s+/);
  const clauses: string[] = [];
  let buffer = "";

  for (const part of parts) {
    const candidate = buffer ? `${buffer} ${part}` : part;
    if (candidate.length >= 15 || parts.length === 1) {
      clauses.push(candidate);
      buffer = "";
    } else {
      buffer = candidate;
    }
  }
  if (buffer.trim()) {
    clauses.push(buffer.trim());
  }

  return clauses.length ? clauses : [trimmed];
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
      const clauses = splitIntoClauses(this.inputText);
      const requestId = shortuuid();

      for (let index = 0; index < clauses.length; index++) {
        const clause = clauses[index];
        if (!clause || !clause.trim()) continue;

        const isLastClause = index === clauses.length - 1;
        try {
          const clip = await getAddisClient().voice.generate({
            text: clause.trim(),
            voiceId: this.voiceId,
            language: "am",
            outputFormat: "pcm_16000",
            clientRequestId: randomUUID(),
          });
          const audio = await clip.arrayBuffer();
          const { pcm, sampleRate } = wavToPcm16(audio);
          if (!pcm || pcm.byteLength === 0) continue;

          const byteStream = new AudioByteStream(sampleRate || SAMPLE_RATE, NUM_CHANNELS);
          const frames = byteStream.write(pcm);

          for (let f = 0; f < frames.length; f++) {
            const frame = frames[f];
            if (!frame) continue;
            const isFinalFrame = isLastClause && f === frames.length - 1;
            this.queue.put({
              requestId,
              segmentId: `${requestId}-${index}`,
              frame,
              final: isFinalFrame,
            });
          }
        } catch (clauseErr) {
          console.warn("[addis.TTS] Clause synthesis failed", clauseErr);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("[addis.TTS] Synthesis error", error);
    } finally {
      this.queue.close();
    }
  }
}
