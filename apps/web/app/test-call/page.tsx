"use client";

import {
  BarVisualizer,
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useCallback, useMemo, useState } from "react";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

type TokenResponse = {
  token: string;
  roomName: string;
  participantName: string;
  url: string;
};

type CallSession = TokenResponse;

function VoiceAssistantPanel() {
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
    <div className="assistant-panel">
      <div className="status-row">
        <span className={`status-dot status-${state}`} />
        <span>{statusLabel}</span>
      </div>
      <div className="visualizer-wrap">
        <BarVisualizer state={state} barCount={5} trackRef={audioTrack} />
      </div>
      <p className="hint">
        Try asking: &quot;What are your hours?&quot; or &quot;How much is a haircut?&quot;
      </p>
    </div>
  );
}

function ActiveCall({
  session,
  onDisconnect,
}: {
  session: CallSession;
  onDisconnect: () => void;
}) {
  return (
    <LiveKitRoom
      token={session.token}
      serverUrl={session.url}
      connect
      audio
      video={false}
      onDisconnected={onDisconnect}
      className="livekit-room"
    >
      <RoomAudioRenderer />
      <VoiceAssistantPanel />
      <button type="button" className="disconnect-button" onClick={onDisconnect}>
        End Call
      </button>
    </LiveKitRoom>
  );
}

export default function TestCallPage() {
  const [session, setSession] = useState<CallSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCall = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await fetch(`${SERVER_URL}/api/livekit/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantName: "demo-caller" }),
      });

      if (!response.ok) {
        throw new Error("Could not start call. Check server and LiveKit credentials.");
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
  }, []);

  const endCall = useCallback(() => {
    setSession(null);
  }, []);

  return (
    <main className="page">
      <section className="card">
        <p className="eyebrow">Sprint 1 · LiveKit voice pipeline</p>
        <h1>Bella Salon Receptionist</h1>
        <p className="subtitle">
          Start a browser call to talk with the AI receptionist. English demo with hardcoded
          business context.
        </p>

        {!session ? (
          <div className="idle-state">
            <button
              type="button"
              className="call-button"
              onClick={startCall}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting..." : "Start Call"}
            </button>
            {error ? <p className="error">{error}</p> : null}
            <p className="footnote">
              Make sure the API server and voice agent are running locally.
            </p>
          </div>
        ) : (
          <ActiveCall session={session} onDisconnect={endCall} />
        )}
      </section>
    </main>
  );
}
