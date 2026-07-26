import type { AudioFrame } from "@livekit/rtc-node";
import { mergeFrames } from "@livekit/agents";

export const ADDIS_STT_SAMPLE_RATE = 16_000;
export const ADDIS_STT_MAX_DURATION_SEC = 55;

/** Build a PCM16 WAV buffer at the given sample rate / channel count. */
export function pcm16ToWav(
  pcm: Buffer,
  sampleRate: number,
  numChannels: number,
): Buffer {
  const dataSize = pcm.byteLength;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numChannels * 2, 28);
  header.writeUInt16LE(numChannels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

/** Downmix interleaved PCM16 to mono by averaging channels. */
export function downmixToMono(pcm: Buffer, numChannels: number): Buffer {
  if (numChannels <= 1) return pcm;
  const samples = pcm.byteLength / 2;
  const frames = samples / numChannels;
  const out = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      sum += pcm.readInt16LE((i * numChannels + ch) * 2);
    }
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sum / numChannels))), i * 2);
  }
  return out;
}

/** Linear-resample mono PCM16 to a target sample rate. */
export function resampleMonoPcm16(
  pcm: Buffer,
  fromRate: number,
  toRate: number,
): Buffer {
  if (fromRate === toRate || pcm.byteLength < 2) return pcm;
  const srcSamples = pcm.byteLength / 2;
  const dstSamples = Math.max(1, Math.round((srcSamples * toRate) / fromRate));
  const out = Buffer.alloc(dstSamples * 2);
  const ratio = srcSamples / dstSamples;
  for (let i = 0; i < dstSamples; i++) {
    const srcIndex = i * ratio;
    const left = Math.floor(srcIndex);
    const right = Math.min(left + 1, srcSamples - 1);
    const frac = srcIndex - left;
    const a = pcm.readInt16LE(left * 2);
    const b = pcm.readInt16LE(right * 2);
    out.writeInt16LE(Math.round(a + (b - a) * frac), i * 2);
  }
  return out;
}

export type AddisSttWav = {
  wav: Buffer;
  sampleRate: number;
  durationSec: number;
  byteLength: number;
};

/**
 * Build a mono 16 kHz PCM16 WAV for Addis STT.
 * Caps duration under the API's 60s limit.
 */
export function framesToAddisSttWav(frames: AudioFrame[]): AddisSttWav {
  if (!frames.length) {
    throw new Error("No audio frames to encode");
  }
  const merged = mergeFrames(frames);
  const sourceRate = merged.sampleRate || ADDIS_STT_SAMPLE_RATE;
  let pcm = Buffer.from(merged.data.buffer, merged.data.byteOffset, merged.data.byteLength);
  pcm = downmixToMono(pcm, merged.channels || 1);
  pcm = resampleMonoPcm16(pcm, sourceRate, ADDIS_STT_SAMPLE_RATE);

  const maxSamples = ADDIS_STT_SAMPLE_RATE * ADDIS_STT_MAX_DURATION_SEC;
  const maxBytes = maxSamples * 2;
  if (pcm.byteLength > maxBytes) {
    pcm = pcm.subarray(pcm.byteLength - maxBytes);
  }

  const durationSec = pcm.byteLength / 2 / ADDIS_STT_SAMPLE_RATE;
  const wav = pcm16ToWav(pcm, ADDIS_STT_SAMPLE_RATE, 1);
  return {
    wav,
    sampleRate: ADDIS_STT_SAMPLE_RATE,
    durationSec,
    byteLength: wav.byteLength,
  };
}

/** Strip a WAV header if present and return raw PCM16 bytes + sample rate guess. */
export function wavToPcm16(wavOrPcm: ArrayBuffer): { pcm: ArrayBuffer; sampleRate: number } {
  const bytes = new Uint8Array(wavOrPcm);
  if (
    bytes.length > 44 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    const sampleRate = new DataView(wavOrPcm).getUint32(24, true);
    return { pcm: wavOrPcm.slice(44), sampleRate: sampleRate || 16_000 };
  }
  return { pcm: wavOrPcm, sampleRate: 16_000 };
}
