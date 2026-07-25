"use client";

import {
  BarVisualizer,
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Clock3, MessageCircleMore, Mic, PhoneOff, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Prefer same-origin Next rewrites so embed iframes avoid cross-origin CORS issues. */
const SERVER_URL = "";

type TokenResponse = {
  token: string;
  roomName: string;
  participantName: string;
  url: string;
};

function VoiceAssistantPanel({ compact = false }: { compact?: boolean }) {
  const { state, audioTrack } = useVoiceAssistant();

  const statusLabel = useMemo(() => {
    switch (state) {
      case "listening":
        return "Listening";
      case "thinking":
        return "Thinking";
      case "speaking":
        return "Speaking";
      default:
        return "Connecting";
    }
  }, [state]);

  return (
    <div className={cn("flex flex-col items-center gap-4", compact ? "py-2" : "py-6")}>
      <div className="flex items-center gap-2 text-sm text-black/60">
        <span
          className={cn(
            "size-2 rounded-full",
            state === "speaking" && "bg-emerald-500 animate-pulse",
            state === "listening" && "bg-blue-500 animate-pulse",
            state === "thinking" && "bg-amber-500 animate-pulse",
            state !== "speaking" && state !== "listening" && state !== "thinking" && "bg-black/30",
          )}
        />
        {statusLabel}
      </div>
      <div className="h-16 w-full max-w-xs [&_.lk-bar-visualizer]:justify-center">
        <BarVisualizer state={state} barCount={5} trackRef={audioTrack} />
      </div>
      {!compact ? (
        <p className="text-center text-xs text-black/40 max-w-xs">
          Try: &quot;What are your hours?&quot; or &quot;How much is a haircut?&quot;
        </p>
      ) : null}
    </div>
  );
}

function ActiveCall({
  session,
  onDisconnect,
  compact,
}: {
  session: TokenResponse;
  onDisconnect: () => void;
  compact?: boolean;
}) {
  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.url}
      connect
      audio
      video={false}
      onDisconnected={onDisconnect}
      className="flex flex-col items-center gap-4"
    >
      <RoomAudioRenderer />
      <VoiceAssistantPanel compact={compact} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onDisconnect}
        className="gap-2 border-black/10 text-black/70 hover:bg-black/[0.04]"
      >
        <PhoneOff className="size-4" />
        End call
      </Button>
    </LiveKitRoom>
  );
}

type VoiceDemoProps = {
  compact?: boolean;
  embed?: boolean;
  className?: string;
  agentId?: string;
  agentSlug?: string;
  receptionistName?: string;
  buttonLabel?: string;
  accentColor?: string;
};

export function VoiceDemo({
  compact = false,
  embed = false,
  className,
  agentId,
  agentSlug,
  receptionistName = "AI Receptionist",
  buttonLabel = "Start Call",
  accentColor = "#7cf0ff",
}: VoiceDemoProps) {
  const [session, setSession] = useState<TokenResponse | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCall = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const resolvedSlug =
        agentSlug ?? (!agentId ? process.env.NEXT_PUBLIC_DEMO_AGENT_SLUG ?? "bella-salon" : undefined);
      const response = await fetch(`${SERVER_URL}/api/livekit/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          participantName: "demo-caller",
          ...(agentId ? { agentId } : { agentSlug: resolvedSlug }),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not start call. Please try again.");
      }

      const data = (await response.json()) as TokenResponse;
      setSession(data);
    } catch (callError) {
      const message =
        callError instanceof Error ? callError.message : "Failed to start call.";
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, [agentId, agentSlug]);

  const endCall = useCallback(() => {
    if (session) {
      void fetch(`${SERVER_URL}/api/livekit/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: session.roomName, outcome: "completed" }),
      });
    }
    setSession(null);
  }, [session]);

  if (embed) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border bg-white p-4",
          className,
        )}
        style={{ borderColor: `${accentColor}66` }}
      >
        {!session ? (
          <>
            <p className="text-sm font-medium text-[#111]">{receptionistName}</p>
            <Button
              type="button"
              onClick={startCall}
              disabled={isConnecting}
              className="h-11 min-w-44 gap-2 text-black"
              style={{ backgroundColor: accentColor }}
            >
              <Mic className="size-4" />
              {isConnecting ? "Connecting..." : buttonLabel}
            </Button>
            {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
          </>
        ) : (
          <ActiveCall session={session} onDisconnect={endCall} compact />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative isolate overflow-hidden rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-[0_24px_80px_rgba(70,61,98,0.16)] backdrop-blur-2xl",
        className,
      )}
    >
      <div className="voice-demo-aurora pointer-events-none absolute -inset-24 -z-10 opacity-80" />
      <div className="pointer-events-none absolute inset-px -z-10 rounded-[27px] bg-gradient-to-br from-white/85 via-white/55 to-violet-50/35" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <Sparkles className="size-3 text-violet-500" />
            <p className="font-pixel text-[10px] tracking-[0.2em] text-black/40">LIVE VOICE DEMO</p>
          </div>
          <h3 className="font-display text-xl font-normal tracking-tight text-[#111]">
            {receptionistName}
          </h3>
          <p className="mt-1 text-xs text-black/40">Natural AI conversation · Available now</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-50/80 px-2.5 py-1.5 shadow-sm">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-medium tracking-wider text-emerald-700">EN · ONLINE</span>
        </div>
      </div>

      {!session ? (
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/70 bg-white/45 px-5 py-6 shadow-inner shadow-white/50">
          <div className="relative flex size-24 items-center justify-center">
            <span className="voice-demo-ring absolute inset-0 rounded-full border border-violet-400/20" />
            <span className="voice-demo-ring absolute inset-3 rounded-full border border-cyan-400/25 [animation-delay:-1s]" />
            <div className="voice-demo-orb relative flex size-16 items-center justify-center rounded-full border border-white/70 shadow-[0_12px_30px_rgba(94,82,150,0.24)]">
              <Mic className="size-6 text-black/55" />
            </div>
          </div>

          <div className="flex h-5 items-center gap-1" aria-hidden="true">
            {[9, 15, 20, 12, 18, 8, 14].map((height, index) => (
              <span
                key={`${height}-${index}`}
                className="voice-demo-wave w-1 rounded-full bg-gradient-to-t from-violet-400 to-cyan-400"
                style={{ height, animationDelay: `${index * -120}ms` }}
              />
            ))}
          </div>

          <p className="max-w-sm text-center text-sm leading-relaxed text-black/50">
            Ask about opening hours, haircut prices, or book an appointment naturally.
          </p>

          <div className="flex flex-wrap justify-center gap-2 text-[10px] text-black/45">
            <span className="flex items-center gap-1 rounded-full border border-black/[0.06] bg-white/60 px-2.5 py-1.5">
              <Clock3 className="size-3" /> Hours & availability
            </span>
            <span className="flex items-center gap-1 rounded-full border border-black/[0.06] bg-white/60 px-2.5 py-1.5">
              <MessageCircleMore className="size-3" /> Services & pricing
            </span>
          </div>

          <Button
            type="button"
            onClick={startCall}
            disabled={isConnecting}
            className="voice-demo-call-button h-12 min-w-52 gap-2 overflow-hidden rounded-xl bg-[#111] px-8 text-white shadow-[0_10px_25px_rgba(17,17,17,0.2)] transition-all hover:-translate-y-0.5 hover:bg-[#252525] hover:shadow-[0_14px_30px_rgba(17,17,17,0.25)]"
          >
            <Mic className="size-4" />
            {isConnecting ? "Connecting..." : buttonLabel || "Start voice call"}
          </Button>
          <p className="text-[10px] tracking-wide text-black/30">Uses your microphone · No phone number required</p>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-600">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <ActiveCall session={session} onDisconnect={endCall} compact={compact} />
      )}
    </div>
  );
}
