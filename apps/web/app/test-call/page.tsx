import Link from "next/link";

import { VoiceDemo } from "@/components/voice/voice-demo";

export default function TestCallPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F4F0] p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <Link href="/agents" className="font-pixel text-xs tracking-[0.25em] text-black/50">
            SOLAR AI
          </Link>
          <h1 className="font-display mt-4 text-3xl font-light">Test call</h1>
          <p className="mt-2 text-sm text-black/45">
            Browser demo using the Bella Salon voice agent (Sprint 1 pipeline).
          </p>
        </div>
        <VoiceDemo />
        <p className="text-center text-xs text-black/35">
          Make sure the API server and voice agent are running locally.
        </p>
      </div>
    </div>
  );
}
