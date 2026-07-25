"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck2 } from "lucide-react";
import { useSelectedAgentId } from "@/components/dashboard/agent-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/providers";

export function BookingToolCard() {
  const agentId = useSelectedAgentId();
  const utils = trpc.useUtils();
  const status = trpc.booking.getStatus.useQuery({ agentId }, { enabled: Boolean(agentId) });
  const setEnabled = trpc.booking.setEnabled.useMutation({
    onSuccess: () => utils.booking.getStatus.invalidate({ agentId }),
  });

  if (!agentId) return null;
  if (status.isLoading) return <Skeleton className="h-40 w-full max-w-2xl rounded-xl" />;
  if (!status.data) return null;

  const summary = [
    status.data.availableSlotCount > 0
      ? `${status.data.availableSlotCount} open slots`
      : "No slots generated",
    status.data.agentActive ? "Agent active" : "Agent not active",
    status.data.enabled ? "Live for callers" : "Off for callers",
  ].join(" · ");

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10">
              <CalendarCheck2 className="size-5 text-violet-600" />
            </div>
            <div>
              <CardTitle>Appointment booking</CardTitle>
              <CardDescription className="mt-1">
                Let callers book verified times through the voice receptionist.
              </CardDescription>
            </div>
          </div>
          <Badge variant={status.data.enabled ? "default" : "secondary"}>
            {status.data.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{summary}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            disabled={(!status.data.ready && !status.data.enabled) || setEnabled.isPending}
            onClick={() => setEnabled.mutate({ agentId, enabled: !status.data.enabled })}
          >
            {status.data.enabled ? "Disable" : "Enable"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/bookings">
              Configure in Bookings
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
        {setEnabled.error ? <p className="text-sm text-destructive">{setEnabled.error.message}</p> : null}
      </CardContent>
    </Card>
  );
}
