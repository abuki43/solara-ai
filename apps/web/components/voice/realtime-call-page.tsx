"use client";

import { useEffect, useRef, useState } from "react";
import { AddisRealtimeClient, type RealtimeState } from "@/lib/addis-realtime";

export function RealtimeCallPage({ slug }: { slug: string }) {
  const [state, setState] = useState<RealtimeState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("");
  const [selectedVoice, setSelectedVoice] = useState<string>("am-hamen");
  const clientRef = useRef<AddisRealtimeClient | null>(null);

  const AMHARIC_VOICES = [
    { id: "am-hamen", name: "Hamen", description: "Female — Warm Conversational" },
    { id: "am-nejat", name: "Nejat", description: "Female — Smooth & Measured" },
    { id: "am-tesfa", name: "Tesfa", description: "Male — Confident & Commercial" },
    { id: "am-muaz", name: "Muaz", description: "Male — Clear & Expressive" },
    { id: "am-yohanes-calm", name: "Yohannes", description: "Male — Calm & Reflective" },
    { id: "am-roba", name: "Roba", description: "Male — Bright & Energetic" },
  ];

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stop();
      }
    };
  }, []);

  const handleStartCall = async () => {
    try {
      setError(null);
      setState("connecting");

      const response = await fetch("http://localhost:3000/api/addis/realtime-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Failed to initiate Realtime session");
      }

      const data = (await response.json()) as {
        apiKey: string;
        agentId?: string;
        internalApiKey?: string;
        organizationName: string;
        greeting?: string;
        systemPrompt?: string;
      };

      setOrgName(data.organizationName || slug);
      setGreeting(data.greeting || "ሰላም! እንኳን በደህና መጡ። እንዴት ልረዳዎት እችላለሁ?");

      const client = new AddisRealtimeClient({
        apiKey: data.apiKey,
        agentId: data.agentId,
        internalApiKey: data.internalApiKey,
        voiceId: selectedVoice,
        systemPrompt: data.systemPrompt,
        onStateChange: (newState) => setState(newState),
        onError: (err) => setError(err),
        onLatency: (ms) => setLatency(ms),
      });

      clientRef.current = client;
      await client.start();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      setError(msg);
      setState("error");
    }
  };

  const handleEndCall = () => {
    if (clientRef.current) {
      clientRef.current.stop();
      clientRef.current = null;
    }
    setState("disconnected");
  };

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white/90 p-8 shadow-xl backdrop-blur-md">
      <div className="text-center">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          Addis AI Realtime WebSocket API (wss://)
        </span>
        <h1 className="mt-3 text-2xl font-bold text-stone-900">
          {orgName || slug} — Amharic Receptionist
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Sub-250ms Instant Voice Stream (`አሌፍ-1.2-realtime-audio`)
        </p>
      </div>

      {greeting && (
        <div className="mt-6 rounded-xl bg-amber-50 p-4 text-center border border-amber-200">
          <p className="text-sm font-medium text-amber-900">{greeting}</p>
        </div>
      )}

      {state === "idle" || state === "disconnected" || state === "error" ? (
        <div className="mt-6">
          <label htmlFor="voice-select" className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
            Select Ethiopian Amharic Voice Type:
          </label>
          <select
            id="voice-select"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm font-medium text-stone-800 shadow-sm focus:border-emerald-500 focus:outline-none"
          >
            {AMHARIC_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.description})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-center border border-red-200">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block size-3 rounded-full ${
              state === "ready"
                ? "bg-emerald-500 animate-pulse"
                : state === "speaking"
                  ? "bg-blue-500 animate-ping"
                  : state === "connecting"
                    ? "bg-amber-500 animate-spin"
                    : "bg-stone-300"
            }`}
          />
          <span className="text-sm font-semibold capitalize text-stone-700">
            State: {state}
          </span>
        </div>

        {latency !== null && (
          <div className="text-xs font-mono font-bold text-emerald-600">
            ⚡ Turn Latency: {latency} ms
          </div>
        )}

        {state === "idle" || state === "disconnected" || state === "error" ? (
          <button
            type="button"
            onClick={handleStartCall}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700 active:scale-95"
          >
            Start Realtime Call (wss://)
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEndCall}
            className="w-full rounded-xl bg-rose-600 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-rose-700 active:scale-95"
          >
            End Call
          </button>
        )}
      </div>
    </div>
  );
}
