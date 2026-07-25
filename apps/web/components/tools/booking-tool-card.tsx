"use client";

import { CalendarCheck2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelectedAgentId } from "@/components/dashboard/agent-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/providers";

export function BookingToolCard() {
  const agentId = useSelectedAgentId();
  const utils = trpc.useUtils();
  const status = trpc.booking.getStatus.useQuery({ agentId }, { enabled: Boolean(agentId) });
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [leadMinutes, setLeadMinutes] = useState(60);
  const [windowDays, setWindowDays] = useState(14);
  const [bufferMinutes, setBufferMinutes] = useState(0);

  useEffect(() => {
    if (!status.data) return;
    setServiceIds(status.data.selectedServiceIds);
    setLeadMinutes(status.data.leadMinutes);
    setWindowDays(status.data.windowDays);
    setBufferMinutes(status.data.bufferMinutes);
  }, [status.data]);

  const invalidate = () => utils.booking.getStatus.invalidate({ agentId });
  const updateConfig = trpc.booking.updateConfig.useMutation({ onSuccess: invalidate });
  const regenerate = trpc.booking.regenerate.useMutation({ onSuccess: invalidate });
  const setEnabled = trpc.booking.setEnabled.useMutation({ onSuccess: invalidate });
  const setNotifications = trpc.booking.setNotifications.useMutation({ onSuccess: invalidate });

  if (!agentId) return null;
  if (status.isLoading) return <Skeleton className="h-96 w-full max-w-3xl rounded-xl" />;
  if (!status.data) return null;
  const error =
    updateConfig.error || regenerate.error || setEnabled.error || setNotifications.error || status.error;

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10">
              <CalendarCheck2 className="size-5 text-violet-600" />
            </div>
            <div>
              <CardTitle>Appointment booking</CardTitle>
              <CardDescription className="mt-1">
                Configure the shared calendar used by callers and your team.
              </CardDescription>
            </div>
          </div>
          <Badge variant={status.data.enabled ? "default" : "secondary"}>
            {status.data.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Generated availability</p>
            <p className="text-lg font-semibold">{status.data.availableSlotCount} slots</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Agent</p>
            <p className="text-sm font-medium">{status.data.agentActive ? "Active" : "Must be active"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Timezone & hours</p>
            <p className="text-sm font-medium">
              {status.data.timezoneValid && status.data.hasHours ? "Ready" : "Needs attention"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Label>Services callers can book</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {status.data.bookableServices.map((service) => (
              <label key={service.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={serviceIds.includes(service.id)}
                  onChange={(event) =>
                    setServiceIds((current) =>
                      event.target.checked
                        ? [...current, service.id]
                        : current.filter((id) => id !== service.id),
                    )
                  }
                />
                <span>{service.name} · {service.durationMinutes} min</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="lead-time">Minimum lead (minutes)</Label>
            <Input id="lead-time" type="number" min={0} max={10080} value={leadMinutes} onChange={(e) => setLeadMinutes(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="window-days">Booking window (days)</Label>
            <Input id="window-days" type="number" min={1} max={365} value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buffer-time">Buffer (minutes)</Label>
            <Input id="buffer-time" type="number" min={0} max={240} step={15} value={bufferMinutes} onChange={(e) => setBufferMinutes(Number(e.target.value))} />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={updateConfig.isPending || !serviceIds.length}
            onClick={() => updateConfig.mutate({ agentId, serviceIds, leadMinutes, windowDays, bufferMinutes })}
          >
            Save configuration
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate({ agentId })}
          >
            <RefreshCw className="mr-2 size-4" />
            {regenerate.isPending ? "Generating..." : "Regenerate availability"}
          </Button>
          <Button
            type="button"
            disabled={(!status.data.ready && !status.data.enabled) || setEnabled.isPending}
            onClick={() => setEnabled.mutate({ agentId, enabled: !status.data.enabled })}
          >
            {status.data.enabled ? "Disable booking" : "Enable booking"}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Telegram events</Label>
          {([
            ["confirmed", "New booking", status.data.bookingNotificationsEnabled],
            ["cancelled", "Cancellation", status.data.bookingCancellationNotificationsEnabled],
            ["rescheduled", "Reschedule", status.data.bookingRescheduleNotificationsEnabled],
          ] as const).map(([event, label, enabled]) => (
            <div key={event} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{label}</span>
              <Button
                type="button"
                size="sm"
                variant={enabled ? "default" : "outline"}
                disabled={!status.data.telegramConnected || setNotifications.isPending}
                onClick={() => setNotifications.mutate({ agentId, event, enabled: !enabled })}
              >
                {enabled ? "On" : "Off"}
              </Button>
            </div>
          ))}
        </div>
        {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      </CardContent>
    </Card>
  );
}
