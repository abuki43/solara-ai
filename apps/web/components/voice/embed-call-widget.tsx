"use client";

import { Clock3 } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VoiceDemo } from "@/components/voice/voice-demo";
import { trpc } from "@/lib/providers";

export function EmbedCallWidget({ slug }: { slug: string }) {
  const { data: agent, isLoading, error } = trpc.agent.getPublicBySlug.useQuery(
    { slug },
    { retry: false },
  );

  if (isLoading) {
    return <Skeleton className="h-[120px] w-full rounded-2xl" />;
  }

  if (error || !agent) {
    return (
      <Card className="border-dashed text-center">
        <CardHeader className="py-6">
          <CardTitle className="text-base">Receptionist not found</CardTitle>
          <CardDescription>This embed link is invalid.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (agent.status !== "active") {
    return (
      <Card className="text-center">
        <CardHeader className="py-6">
          <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
            <Clock3 className="size-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-base">Currently unavailable</CardTitle>
          <CardDescription>
            {(agent.businessName || agent.organizationName)}&apos;s AI receptionist is paused.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const businessName = agent.businessName || agent.organizationName;

  return (
    <VoiceDemo
      compact
      embed
      agentSlug={slug}
      receptionistName={businessName}
      buttonLabel={agent.widgetButtonLabel}
      accentColor={agent.widgetAccentColor}
      className="rounded-2xl p-4 shadow-md"
    />
  );
}
