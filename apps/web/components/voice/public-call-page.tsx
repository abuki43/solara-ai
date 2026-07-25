"use client";

import { Bot, Clock3, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceDemo } from "@/components/voice/voice-demo";
import { trpc } from "@/lib/providers";

export function PublicCallPage({ slug }: { slug: string }) {
  const { data: agent, isLoading, error } = trpc.agent.getPublicBySlug.useQuery(
    { slug },
    { retry: false },
  );

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4">
        <Skeleton className="mx-auto h-8 w-52" />
        <Skeleton className="h-96 rounded-[28px]" />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <Card className="mx-auto max-w-lg border-dashed text-center">
        <CardHeader>
          <CardTitle>Receptionist not found</CardTitle>
          <CardDescription>This browser call link is invalid or no longer available.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (agent.status !== "active") {
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <Clock3 className="size-5 text-muted-foreground" />
          </div>
          <CardTitle>Currently unavailable</CardTitle>
          <CardDescription>
            {agent.organizationName}&apos;s AI receptionist is paused. Please contact the business
            directly and try again later.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const businessName = agent.businessName || agent.organizationName;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full border border-black/10 bg-white/60 backdrop-blur">
          <Bot className="size-5 text-black/55" />
        </div>
        <h1 className="text-3xl font-light tracking-tight">{businessName}</h1>
        <p className="mt-2 text-sm text-black/45">{agent.description || "How can we help today?"}</p>
      </div>

      <VoiceDemo
        agentSlug={slug}
        receptionistName={`${businessName} AI Receptionist`}
      />

      <Card className="mt-4 border-white/60 bg-white/45 backdrop-blur">
        <CardContent className="flex items-start gap-3 p-4 text-xs leading-relaxed text-black/45">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          You are speaking with an AI assistant. Do not share passwords, payment credentials, or
          sensitive medical information.
        </CardContent>
      </Card>

      <p className="mt-5 text-center text-[10px] uppercase tracking-[0.2em] text-black/30">
        Powered by{" "}
        <Link href="/" className="text-black/50 hover:text-black">
          Solar AI
        </Link>
      </p>
    </div>
  );
}
