"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/providers";

export function BookingSetupOverview({
  agentId,
  onOpenCalendar,
}: {
  agentId: string;
  onOpenCalendar: () => void;
}) {
  const utils = trpc.useUtils();
  const status = trpc.booking.getStatus.useQuery({ agentId });
  const setEnabled = trpc.booking.setEnabled.useMutation({
    onSuccess: () => utils.booking.getStatus.invalidate({ agentId }),
  });

  if (!status.data) return null;

  const steps = [
    {
      done: status.data.agentActive,
      label: "Agent is active",
      hint: status.data.agentActive ? "Ready for calls" : "Activate the agent from Agents",
      href: "/agents",
    },
    {
      done: status.data.hasHours && status.data.timezoneValid,
      label: "Opening hours and timezone configured",
      hint: "Set business hours in Knowledge and timezone in Settings",
      href: "/knowledge",
    },
    {
      done: status.data.bookableServices.length > 0,
      label: "At least one bookable service",
      hint: "Add services and mark them bookable in Knowledge",
      href: "/knowledge",
    },
    {
      done: status.data.selectedServiceIds.length > 0,
      label: "Services selected for booking",
      hint: "Choose bookable services in Calendar settings",
      action: onOpenCalendar,
    },
    {
      done: status.data.availableSlotCount > 0,
      label: "Availability generated",
      hint: `${status.data.availableSlotCount} open slots in the calendar`,
      action: onOpenCalendar,
    },
  ];

  const completed = steps.filter((step) => step.done).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>Booking status</CardTitle>
              <CardDescription>
                {completed} of {steps.length} setup steps complete
              </CardDescription>
            </div>
            <Badge variant={status.data.enabled ? "default" : "secondary"}>
              {status.data.enabled ? "Live for callers" : "Not live"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Open slots</p>
              <p className="text-2xl font-semibold">{status.data.availableSlotCount}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Bookable services</p>
              <p className="text-2xl font-semibold">{status.data.selectedServiceIds.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Lead time</p>
              <p className="text-2xl font-semibold">{status.data.leadMinutes}m</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={(!status.data.ready && !status.data.enabled) || setEnabled.isPending}
              onClick={() => setEnabled.mutate({ agentId, enabled: !status.data.enabled })}
            >
              {status.data.enabled ? "Disable booking" : "Enable booking for callers"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href={`/test-call?agentId=${agentId}`}>
                <Phone className="mr-2 size-4" />
                Test booking call
              </Link>
            </Button>
          </div>
          {setEnabled.error ? (
            <p className="text-sm text-destructive">{setEnabled.error.message}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup checklist</CardTitle>
          <CardDescription>Complete these before enabling voice booking.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step) => (
            <div key={step.label} className="flex items-start gap-3 rounded-lg border p-3">
              {step.done ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.hint}</p>
              </div>
              {!step.done && step.href ? (
                <Button type="button" size="sm" variant="outline" asChild>
                  <Link href={step.href}>Fix</Link>
                </Button>
              ) : null}
              {!step.done && step.action ? (
                <Button type="button" size="sm" variant="outline" onClick={step.action}>
                  Open
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
