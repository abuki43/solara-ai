"use client";

import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import { VoiceDemo } from "@/components/voice/voice-demo";
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
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-9 w-64" />
          <Skeleton className="mx-auto h-5 w-72" />
        </div>
        <Skeleton className="h-96 rounded-[28px]" />
      </div>
    );
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

  const businessName = agent.businessName || "Your business";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-light">Test {agent.name}</h1>
        <p className="mt-2 text-sm text-black/45">
          Browser test call for {businessName}. Changes to this receptionist are used immediately.
        </p>
      </div>
      <VoiceDemo
        agentId={agent.id}
        receptionistName={`${businessName} · ${agent.name}`}
      />
    </div>
  );
}
