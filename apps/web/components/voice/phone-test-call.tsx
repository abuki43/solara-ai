"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useVoiceAssistant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Delete,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const SHORT_CODE = "7856";
const SERVER_URL = "";

type TokenResponse = {
  token: string;
  roomName: string;
  participantName: string;
  url: string;
};

type CallPhase = "idle" | "ringing" | "active";

const KEYS: Array<{ digit: string; letters: string }> = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" },
  { digit: "0", letters: "+" },
  { digit: "#", letters: "" },
];

function formatDuration(totalSeconds: number) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/** Classic dual-tone ring via Web Audio — no asset file required. */
function useRingtone(active: boolean) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    let cancelled = false;
    let timeoutId: number | undefined;

    const playBurst = () => {
      if (cancelled) return;
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.04);
      gain.gain.setValueAtTime(0.08, now + 1.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      gain.connect(ctx.destination);

      for (const freq of [440, 480]) {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 1.2);
      }

      timeoutId = window.setTimeout(playBurst, 2200);
    };

    void ctx.resume().then(() => {
      if (!cancelled) playBurst();
    });

    return () => {
      cancelled = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      void ctx.close();
    };
  }, [active]);
}

function MuteControl() {
  const { localParticipant } = useLocalParticipant();
  const muted = !localParticipant.isMicrophoneEnabled;

  return (
    <button
      type="button"
      onClick={() => {
        void localParticipant.setMicrophoneEnabled(muted);
      }}
      className="flex flex-col items-center gap-2 text-white/85"
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full transition",
          muted ? "bg-white text-[#111]" : "bg-white/15 hover:bg-white/25",
        )}
      >
        {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
      </span>
      <span className="text-[11px] tracking-wide">{muted ? "Unmute" : "Mute"}</span>
    </button>
  );
}

/** Stop ringing only once the AI agent is up and in a conversational state. */
function AgentReadyBridge({ onReady }: { onReady: () => void }) {
  const { state } = useVoiceAssistant();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    // connecting / initializing still count as ringing; agent is ready when it can listen or speak
    if (state === "listening" || state === "thinking" || state === "speaking") {
      fired.current = true;
      onReady();
    }
  }, [onReady, state]);

  return null;
}

function InCallScreen({
  contactName,
  phase,
  elapsedSec,
  onHangUp,
  onAgentReady,
  session,
}: {
  contactName: string;
  phase: "ringing" | "active";
  elapsedSec: number;
  onHangUp: () => void;
  onAgentReady: () => void;
  session: TokenResponse;
}) {
  useRingtone(phase === "ringing");

  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.url}
      connect
      audio
      video={false}
      onDisconnected={onHangUp}
      className="flex h-full flex-col"
    >
      <RoomAudioRenderer />
      <AgentReadyBridge onReady={onAgentReady} />

      <div className="relative flex h-full flex-col items-center px-6 pb-10 pt-14 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,120,90,0.35),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(20,24,28,0.9),#0b0d10_70%)]" />

        <div className="relative z-10 flex flex-1 flex-col items-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Solar AI</p>
          <div className="mt-10 flex size-24 items-center justify-center rounded-full bg-gradient-to-b from-[#3d5c4a] to-[#1f2e26] text-3xl font-light tracking-wide shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
            {contactName.slice(0, 1).toUpperCase()}
          </div>
          <h2 className="mt-6 text-3xl font-light tracking-tight" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {contactName}
          </h2>
          <p className="mt-2 font-mono text-lg tracking-[0.2em] text-white/70">{SHORT_CODE}</p>
          <p
            className={cn(
              "mt-4 text-sm",
              phase === "ringing" ? "animate-pulse text-emerald-300/90" : "text-white/55",
            )}
          >
            {phase === "ringing" ? "Calling…" : formatDuration(elapsedSec)}
          </p>
        </div>

        <div className="relative z-10 mt-auto flex w-full max-w-xs items-end justify-around pb-2">
          {phase === "active" ? <MuteControl /> : <span className="size-14" />}
          <button
            type="button"
            onClick={onHangUp}
            className="flex flex-col items-center gap-2 text-white"
            aria-label="End call"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-[#e11d48] shadow-[0_10px_30px_rgba(225,29,72,0.45)] transition hover:bg-[#be123c]">
              <PhoneOff className="size-7" />
            </span>
            <span className="text-[11px] tracking-wide text-white/70">End</span>
          </button>
          <span className="size-14" />
        </div>
      </div>
    </LiveKitRoom>
  );
}

export function PhoneTestCall({
  agentId,
  contactName,
}: {
  agentId: string;
  contactName: string;
}) {
  const [digits, setDigits] = useState("");
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const connectedAtRef = useRef<number | null>(null);
  const callGenerationRef = useRef(0);

  useEffect(() => {
    if (phase !== "active") return;
    connectedAtRef.current = Date.now();
    setElapsedSec(0);
    const id = window.setInterval(() => {
      if (!connectedAtRef.current) return;
      setElapsedSec(Math.floor((Date.now() - connectedAtRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  const hangUp = useCallback(() => {
    callGenerationRef.current += 1;
    if (session) {
      void fetch(`${SERVER_URL}/api/livekit/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: session.roomName, outcome: "completed" }),
      });
    }
    setSession(null);
    setPhase("idle");
    setElapsedSec(0);
    connectedAtRef.current = null;
  }, [session]);

  const startCall = useCallback(async () => {
    if (digits !== SHORT_CODE) {
      setError(`Dial ${SHORT_CODE} to reach the receptionist.`);
      return;
    }

    const generation = callGenerationRef.current + 1;
    callGenerationRef.current = generation;
    setError(null);
    setPhase("ringing");

    try {
      const response = await fetch(`${SERVER_URL}/api/livekit/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          participantName: "phone-caller",
          agentId,
        }),
      });

      if (callGenerationRef.current !== generation) return;

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not place the call.");
      }

      const data = (await response.json()) as TokenResponse;
      if (callGenerationRef.current !== generation) {
        void fetch(`${SERVER_URL}/api/livekit/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName: data.roomName, outcome: "abandoned" }),
        });
        return;
      }
      setSession(data);
    } catch (callError) {
      if (callGenerationRef.current !== generation) return;
      setPhase("idle");
      setSession(null);
      setError(callError instanceof Error ? callError.message : "Call failed.");
    }
  }, [agentId, digits]);

  const pressKey = (digit: string) => {
    setError(null);
    setDigits((current) => (current.length >= 12 ? current : `${current}${digit}`));
  };

  if (phase !== "idle" && session) {
    return (
      <div className="mx-auto h-[680px] w-full max-w-[360px] overflow-hidden rounded-[36px] border border-black/40 bg-[#0b0d10] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <InCallScreen
          contactName={contactName}
          phase={phase === "active" ? "active" : "ringing"}
          elapsedSec={elapsedSec}
          onHangUp={hangUp}
          onAgentReady={() => setPhase("active")}
          session={session}
        />
      </div>
    );
  }

  if (phase === "ringing" && !session) {
    // Token still loading — show ringing shell without LiveKit yet
    return (
      <div className="mx-auto h-[680px] w-full max-w-[360px] overflow-hidden rounded-[36px] border border-black/40 bg-[#0b0d10] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <RingingPlaceholder contactName={contactName} onHangUp={hangUp} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[680px] w-full max-w-[360px] flex-col overflow-hidden rounded-[36px] border border-black/10 bg-[#f3f1ec] shadow-[0_30px_80px_rgba(40,36,28,0.18)]">
      <div className="flex items-center justify-center px-6 pt-8">
        <div className="h-1.5 w-20 rounded-full bg-black/10" />
      </div>

      <div className="flex flex-1 flex-col px-6 pt-8">
        <p className="text-center text-[11px] uppercase tracking-[0.28em] text-black/35">
          Phone
        </p>
        <div className="mt-8 min-h-[88px] text-center">
          <p className="font-mono text-4xl tracking-[0.18em] text-[#111]">
            {digits || <span className="text-black/20">····</span>}
          </p>
          {digits === SHORT_CODE ? (
            <p className="mt-3 text-sm text-black/50">{contactName}</p>
          ) : (
            <p className="mt-3 text-sm text-black/35">Dial short code {SHORT_CODE}</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-3">
          {KEYS.map((key) => (
            <button
              key={key.digit}
              type="button"
              onClick={() => pressKey(key.digit)}
              className="flex h-[68px] flex-col items-center justify-center rounded-full bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)] transition active:scale-95 active:bg-[#ebe8e1]"
            >
              <span className="text-[26px] font-light leading-none text-[#111]">{key.digit}</span>
              {key.letters ? (
                <span className="mt-1 text-[9px] font-medium tracking-[0.2em] text-black/35">
                  {key.letters}
                </span>
              ) : (
                <span className="mt-1 h-[11px]" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between px-4 pb-10 pt-6">
          <button
            type="button"
            onClick={() => {
              setDigits(SHORT_CODE);
              setError(null);
            }}
            className="text-xs font-medium tracking-wide text-black/40 transition hover:text-black/70"
          >
            Contacts
          </button>

          <button
            type="button"
            onClick={() => void startCall()}
            disabled={digits !== SHORT_CODE}
            className={cn(
              "flex size-[72px] items-center justify-center rounded-full transition",
              digits === SHORT_CODE
                ? "bg-[#1f9d55] text-white shadow-[0_12px_28px_rgba(31,157,85,0.4)] hover:bg-[#18864a] active:scale-95"
                : "bg-black/10 text-black/25",
            )}
            aria-label="Call"
          >
            <Phone className="size-7 fill-current" />
          </button>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setDigits((current) => current.slice(0, -1));
            }}
            className="flex size-11 items-center justify-center rounded-full text-black/45 transition hover:bg-black/5 hover:text-black/70"
            aria-label="Delete"
          >
            <Delete className="size-5" />
          </button>
        </div>

        {error ? (
          <p className="pb-6 text-center text-xs text-red-600">{error}</p>
        ) : (
          <p className="pb-6 text-center text-[11px] text-black/30">
            Tap Contacts to fill {SHORT_CODE}
          </p>
        )}
      </div>
    </div>
  );
}

function RingingPlaceholder({
  contactName,
  onHangUp,
}: {
  contactName: string;
  onHangUp: () => void;
}) {
  useRingtone(true);

  return (
    <div className="relative flex h-full flex-col items-center px-6 pb-10 pt-14 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,120,90,0.35),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(20,24,28,0.9),#0b0d10_70%)]" />
      <div className="relative z-10 flex flex-1 flex-col items-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Solar AI</p>
        <div className="mt-10 flex size-24 items-center justify-center rounded-full bg-gradient-to-b from-[#3d5c4a] to-[#1f2e26] text-3xl font-light tracking-wide">
          {contactName.slice(0, 1).toUpperCase()}
        </div>
        <h2 className="mt-6 text-3xl font-light tracking-tight">{contactName}</h2>
        <p className="mt-2 font-mono text-lg tracking-[0.2em] text-white/70">{SHORT_CODE}</p>
        <p className="mt-4 animate-pulse text-sm text-emerald-300/90">Calling…</p>
      </div>
      <button
        type="button"
        onClick={onHangUp}
        className="relative z-10 flex flex-col items-center gap-2"
        aria-label="End call"
      >
        <span className="flex size-16 items-center justify-center rounded-full bg-[#e11d48]">
          <PhoneOff className="size-7" />
        </span>
        <span className="text-[11px] tracking-wide text-white/70">End</span>
      </button>
    </div>
  );
}
