import type { AudioFrame } from "@livekit/rtc-node";
import { mergeFrames } from "@livekit/agents";

/** Build a mono/stereo PCM16 WAV buffer from LiveKit audio frames. */
export function framesToWav(frames: AudioFrame[]): Buffer {
  if (!frames.length) {
    throw new Error("No audio frames to encode");
  }
  const merged = mergeFrames(frames);
  const sampleRate = merged.sampleRate;
  const numChannels = merged.channels;
  const pcm = Buffer.from(merged.data.buffer, merged.data.byteOffset, merged.data.byteLength);
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
