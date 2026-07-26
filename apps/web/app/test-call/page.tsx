import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { TestCallContent } from "@/components/voice/test-call-content";

export default async function TestCallPage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { agentId } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#d9d4c8] p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.55),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(80,100,70,0.12),transparent_45%)]" />

      <Link
        href="/agents"
        className="absolute left-6 top-6 z-10 flex size-10 items-center justify-center rounded-full border border-black/10 bg-white/70 text-black/60 transition hover:bg-white hover:text-black"
        aria-label="Back to agents"
      >
        <ArrowLeft className="size-5" />
      </Link>

      <div className="relative z-10 w-full max-w-lg space-y-5">
        <div className="text-center">
          <p className="font-pixel text-[10px] tracking-[0.28em] text-black/40">SOLARA AI</p>
          <p className="mt-2 text-sm text-black/45">Dial 7856 English · 7855 Amharic</p>
        </div>
        <TestCallContent agentId={agentId} />
      </div>
    </div>
  );
}
