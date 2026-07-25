"use client";

import Link from "next/link";

import { PhoneTestCall } from "@/components/voice/phone-test-call";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/providers";

export function TestCallContent({ agentId }: { agentId?: string }) {
  const { data: agent, isLoading, error } = trpc.agent.get.useQuery(
    { id: agentId! },
    { enabled: Boolean(agentId), retry: false },
  );

  if (!agentId) {
    return (
      <div className="rounded-2xl border border-dashed bg-white/60 p-8 text-center">
        <p className="text-sm text-black/50">Select a receptionist before starting a test call.</p>
        <Link href="/agents" className="mt-3 inline-block text-sm font-medium underline">
          Choose receptionist
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="mx-auto h-[680px] w-full max-w-[360px] rounded-[36px]" />;
  }

  if (error || !agent) {
    return (
      <div className="rounded-2xl border border-dashed bg-white/60 p-8 text-center">
        <p className="text-sm text-black/50">This receptionist could not be loaded.</p>
        <Link href="/agents" className="mt-3 inline-block text-sm font-medium underline">
          Return to receptionists
        </Link>
      </div>
    );
  }

  const contactName = agent.businessName || agent.name;

  return <PhoneTestCall agentId={agent.id} contactName={contactName} />;
}
