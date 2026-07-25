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
    <div className="relative flex min-h-screen items-center justify-center bg-[#F5F4F0] p-6">
      <Link
        href="/agents"
        className="absolute left-6 top-6 flex size-10 items-center justify-center rounded-full border border-black/10 bg-white/70 text-black/60 transition hover:bg-white hover:text-black"
        aria-label="Back to agents"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <div className="w-full max-w-lg space-y-6">
        <Link
          href="/agents"
          className="block text-center font-pixel text-xs tracking-[0.25em] text-black/50"
        >
          SOLAR AI
        </Link>
        <TestCallContent agentId={agentId} />
        <p className="text-center text-xs text-black/35">
          Make sure the API server and voice agent are running locally.
        </p>
      </div>
    </div>
  );
}
