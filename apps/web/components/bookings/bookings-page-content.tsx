"use client";

import { CalendarPlus, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useSelectedAgentId } from "@/components/dashboard/agent-selector";
import { BookingCalendarSettings } from "@/components/bookings/booking-calendar-settings";
import { BookingSetupOverview } from "@/components/bookings/booking-setup-overview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/providers";

type Filter = "upcoming" | "past" | "cancelled" | "all";
type BookingsTab = "overview" | "appointments" | "calendar" | "blocked";

const tabs: { id: BookingsTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "appointments", label: "Appointments" },
  { id: "calendar", label: "Calendar" },
  { id: "blocked", label: "Blocked times" },
];

function localIso(value: string) {
  return new Date(value).toISOString();
}

export function BookingsPageContent() {
  const agentId = useSelectedAgentId();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<BookingsTab>("overview");
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [search, setSearch] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [callerName, setCallerName] = useState("");
  const [callerContact, setCallerContact] = useState("");
  const [notes, setNotes] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [action, setAction] = useState<{ id: string; kind: "cancel" | "reschedule" } | null>(null);
  const [actionValue, setActionValue] = useState("");

  const list = trpc.booking.list.useQuery(
    { agentId: agentId || undefined, filter, search },
    { enabled: Boolean(agentId) && tab === "appointments" },
  );
  const status = trpc.booking.getStatus.useQuery({ agentId }, { enabled: Boolean(agentId) });
  const blocks = trpc.booking.listBlocks.useQuery(
    { agentId },
    { enabled: Boolean(agentId) && tab === "blocked" },
  );

  const refresh = async () => {
    await Promise.all([
      utils.booking.list.invalidate(),
      utils.booking.listBlocks.invalidate(),
      utils.booking.getStatus.invalidate(),
    ]);
  };

  const create = trpc.booking.create.useMutation({ onSuccess: refresh });
  const cancel = trpc.booking.cancel.useMutation({ onSuccess: refresh });
  const reschedule = trpc.booking.reschedule.useMutation({ onSuccess: refresh });
  const setStatus = trpc.booking.setLifecycleStatus.useMutation({ onSuccess: refresh });
  const retry = trpc.booking.retryNotification.useMutation({ onSuccess: refresh });
  const createBlock = trpc.booking.createBlock.useMutation({ onSuccess: refresh });
  const deleteBlock = trpc.booking.deleteBlock.useMutation({ onSuccess: refresh });

  const error =
    list.error ||
    create.error ||
    cancel.error ||
    reschedule.error ||
    setStatus.error ||
    retry.error ||
    createBlock.error ||
    deleteBlock.error;

  async function createManualBooking() {
    if (!agentId || !serviceId || !startTime) return;
    await create.mutateAsync({
      agentId,
      serviceId,
      startTime: localIso(startTime),
      callerName,
      callerContact,
      ownerNotes: notes || undefined,
    });
    setStartTime("");
    setCallerName("");
    setCallerContact("");
    setNotes("");
  }

  async function submitAction() {
    if (!action || !actionValue) return;
    if (action.kind === "cancel") {
      await cancel.mutateAsync({ id: action.id, reason: actionValue });
    } else {
      await reschedule.mutateAsync({ id: action.id, startTime: localIso(actionValue) });
    }
    setAction(null);
    setActionValue("");
  }

  if (!agentId) {
    return (
      <Card>
        <CardContent className="p-8 text-sm text-muted-foreground">
          Create or select an agent to manage bookings.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={tab === item.id ? "default" : "outline"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
        {status.data ? (
          <Badge className="ml-auto" variant={status.data.enabled ? "default" : "secondary"}>
            {status.data.enabled ? "Booking live" : "Booking off"}
          </Badge>
        ) : null}
      </div>

      {tab === "overview" ? (
        <BookingSetupOverview agentId={agentId} onOpenCalendar={() => setTab("calendar")} />
      ) : null}

      {tab === "calendar" ? (
        <BookingCalendarSettings agentId={agentId} onUpdated={refresh} />
      ) : null}

      {tab === "appointments" ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search caller, contact, service, or confirmation"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="past">Past</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="all">All bookings</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {list.isLoading ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : (
            <div className="space-y-3">
              {list.data?.map(({ booking, agentName }) => (
                <Card key={booking.id}>
                  <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{booking.callerName}</p>
                        <Badge variant={booking.status === "confirmed" ? "default" : "secondary"}>
                          {booking.status.replace("_", " ")}
                        </Badge>
                        <Badge variant="outline">TG: {booking.telegramStatus.replace("_", " ")}</Badge>
                      </div>
                      <p className="mt-1 text-sm">
                        {booking.serviceName} · {new Date(booking.startTime).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {agentName} · {booking.callerContact} · Confirmation{" "}
                        {booking.confirmationCode ?? booking.id.slice(0, 8)}
                      </p>
                      {booking.ownerNotes ? (
                        <p className="mt-2 text-xs text-muted-foreground">Note: {booking.ownerNotes}</p>
                      ) : null}
                      {booking.telegramError ? (
                        <p className="mt-1 text-xs text-destructive">{booking.telegramError}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {booking.status === "confirmed" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAction({ id: booking.id, kind: "reschedule" });
                              setActionValue("");
                            }}
                          >
                            Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAction({ id: booking.id, kind: "cancel" });
                              setActionValue("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setStatus.mutate({ id: booking.id, status: "completed" })}
                          >
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setStatus.mutate({ id: booking.id, status: "no_show" })}
                          >
                            No-show
                          </Button>
                        </>
                      ) : null}
                      {booking.telegramStatus === "failed" ? (
                        <Button size="sm" variant="outline" onClick={() => retry.mutate({ id: booking.id })}>
                          <RefreshCw className="mr-1 size-3" />
                          Retry Telegram
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!list.data?.length ? (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No bookings match this view.
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}

          {action ? (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle>{action.kind === "cancel" ? "Cancel booking" : "Reschedule booking"}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                {action.kind === "cancel" ? (
                  <Input
                    placeholder="Cancellation reason"
                    value={actionValue}
                    onChange={(event) => setActionValue(event.target.value)}
                  />
                ) : (
                  <Input
                    type="datetime-local"
                    value={actionValue}
                    onChange={(event) => setActionValue(event.target.value)}
                  />
                )}
                <Button disabled={!actionValue} onClick={submitAction}>
                  Confirm
                </Button>
                <Button variant="ghost" onClick={() => setAction(null)}>
                  Close
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarPlus className="size-5" />
                Manual booking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose service" />
                </SelectTrigger>
                <SelectContent>
                  {status.data?.bookableServices
                    .filter((service) => status.data.selectedServiceIds.includes(service.id))
                    .map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} · {service.durationMinutes} min
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
              <Input
                placeholder="Caller name"
                value={callerName}
                onChange={(event) => setCallerName(event.target.value)}
              />
              <Input
                placeholder="Phone or contact"
                value={callerContact}
                onChange={(event) => setCallerContact(event.target.value)}
              />
              <Textarea
                placeholder="Owner notes (optional)"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <Button
                disabled={!serviceId || !startTime || !callerName || !callerContact || create.isPending}
                onClick={createManualBooking}
              >
                Create booking
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "blocked" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5" />
              Blocked times
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Starts</Label>
                <Input
                  type="datetime-local"
                  value={blockStart}
                  onChange={(event) => setBlockStart(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Ends</Label>
                <Input
                  type="datetime-local"
                  value={blockEnd}
                  onChange={(event) => setBlockEnd(event.target.value)}
                />
              </div>
            </div>
            <Input
              placeholder="Holiday, closure, or hold"
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
            />
            <Button
              variant="outline"
              disabled={!blockStart || !blockEnd}
              onClick={() =>
                createBlock.mutate({
                  agentId,
                  startsAt: localIso(blockStart),
                  endsAt: localIso(blockEnd),
                  reason: blockReason || undefined,
                })
              }
            >
              Block time
            </Button>
            <div className={cn("space-y-2 pt-2", !blocks.data?.length && "text-sm text-muted-foreground")}>
              {blocks.data?.map((block) => (
                <div key={block.id} className="flex items-center justify-between rounded-lg border p-3 text-xs">
                  <span>
                    {new Date(block.startsAt).toLocaleString()} – {new Date(block.endsAt).toLocaleString()}
                    {block.reason ? ` · ${block.reason}` : ""}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => deleteBlock.mutate({ id: block.id })}>
                    Remove
                  </Button>
                </div>
              ))}
              {!blocks.data?.length ? <p>No blocked times yet.</p> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
    </div>
  );
}
