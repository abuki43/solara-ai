"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/providers";

export function BookingCalendarSettings({
  agentId,
  onUpdated,
}: {
  agentId: string;
  onUpdated?: () => void;
}) {
  const utils = trpc.useUtils();
  const status = trpc.booking.getStatus.useQuery({ agentId });
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

  const invalidate = async () => {
    await utils.booking.getStatus.invalidate({ agentId });
    onUpdated?.();
  };
  const updateConfig = trpc.booking.updateConfig.useMutation({ onSuccess: invalidate });
  const regenerate = trpc.booking.regenerate.useMutation({ onSuccess: invalidate });
  const setNotifications = trpc.booking.setNotifications.useMutation({ onSuccess: invalidate });

  if (!status.data) return null;
  const error = updateConfig.error || regenerate.error || setNotifications.error || status.error;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bookable services</CardTitle>
          <CardDescription>
            Choose which services callers can reserve. Edit names, durations, and prices in{" "}
            <Link href="/knowledge" className="text-primary underline-offset-4 hover:underline">
              Knowledge
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                <span>
                  {service.name} · {service.durationMinutes} min
                </span>
              </label>
            ))}
          </div>
          {!status.data.bookableServices.length ? (
            <p className="text-sm text-muted-foreground">
              No bookable services yet. Add services in Knowledge first.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduling rules</CardTitle>
          <CardDescription>Lead time, booking window, and buffer between appointments.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="lead-time">Minimum lead (minutes)</Label>
            <Input
              id="lead-time"
              type="number"
              min={0}
              max={10080}
              value={leadMinutes}
              onChange={(event) => setLeadMinutes(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="window-days">Booking window (days)</Label>
            <Input
              id="window-days"
              type="number"
              min={1}
              max={365}
              value={windowDays}
              onChange={(event) => setWindowDays(Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buffer-time">Buffer (minutes)</Label>
            <Input
              id="buffer-time"
              type="number"
              min={0}
              max={240}
              step={15}
              value={bufferMinutes}
              onChange={(event) => setBufferMinutes(Number(event.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={updateConfig.isPending || !serviceIds.length}
          onClick={() =>
            updateConfig.mutate({ agentId, serviceIds, leadMinutes, windowDays, bufferMinutes })
          }
        >
          Save calendar settings
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Telegram booking alerts</CardTitle>
          <CardDescription>
            Connect Telegram in{" "}
            <Link href="/tools" className="text-primary underline-offset-4 hover:underline">
              Tools
            </Link>{" "}
            first, then choose which booking events notify your chat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(
            [
              ["confirmed", "New booking", status.data.bookingNotificationsEnabled],
              ["cancelled", "Cancellation", status.data.bookingCancellationNotificationsEnabled],
              ["rescheduled", "Reschedule", status.data.bookingRescheduleNotificationsEnabled],
            ] as const
          ).map(([event, label, enabled]) => (
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
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
    </div>
  );
}
