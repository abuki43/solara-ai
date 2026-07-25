"use client";

import { useMemo, useState } from "react";

import { useSelectedAgentId } from "@/components/dashboard/agent-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/providers";

const OUTCOMES = [
  "all",
  "completed",
  "booked",
  "handoff",
  "abandoned",
  "failed",
  "started",
] as const;

type DateRange = "today" | "7d" | "30d" | "all";

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function outcomeVariant(outcome: string): "default" | "secondary" | "destructive" | "outline" {
  if (outcome === "booked") return "default";
  if (outcome === "handoff") return "secondary";
  if (outcome === "failed") return "destructive";
  return "outline";
}

/** Stable day-boundary ISO so the tRPC query key does not change every render. */
function rangeStartIso(range: DateRange): string | undefined {
  if (range === "all") return undefined;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === "7d") start.setDate(start.getDate() - 6);
  if (range === "30d") start.setDate(start.getDate() - 29);
  return start.toISOString();
}

export function CallsPageContent() {
  const agentId = useSelectedAgentId();
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("all");
  const [range, setRange] = useState<DateRange>("7d");
  const [allAgents, setAllAgents] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const from = useMemo(() => rangeStartIso(range), [range]);

  const listQuery = trpc.calls.list.useQuery(
    {
      agentId: allAgents ? undefined : agentId || undefined,
      allAgents,
      outcome: outcome === "all" ? undefined : outcome,
      from,
      page,
    },
    { enabled: Boolean(agentId) || allAgents },
  );

  const detailQuery = trpc.calls.getById.useQuery(
    { callId: selectedCallId ?? "" },
    { enabled: Boolean(selectedCallId) },
  );

  if (!agentId && !allAgents) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Choose a receptionist</CardTitle>
          <CardDescription>
            Select a receptionist in the header to view call summaries.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalPages = Math.max(
    1,
    Math.ceil((listQuery.data?.total ?? 0) / (listQuery.data?.pageSize ?? 20)),
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Call history</CardTitle>
          <CardDescription>
            Short summaries for each call. Open a row for booking or handoff details.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Outcome</Label>
            <Select
              value={outcome}
              onValueChange={(value) => {
                setPage(1);
                setOutcome(value as (typeof OUTCOMES)[number]);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === "all" ? "All outcomes" : value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date range</Label>
            <Select
              value={range}
              onValueChange={(value) => {
                setPage(1);
                setRange(value as typeof range);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allAgents}
                onChange={(event) => {
                  setPage(1);
                  setAllAgents(event.target.checked);
                }}
              />
              Show all agents
            </label>
          </div>
        </CardContent>
      </Card>

      {listQuery.isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : listQuery.data?.items.length ? (
        <Card>
          <CardContent className="divide-y p-0">
            {listQuery.data.items.map((call) => (
              <div
                key={call.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">
                      {new Date(call.startedAt).toLocaleString()}
                    </p>
                    <Badge variant={outcomeVariant(call.outcome)}>{call.outcome}</Badge>
                    <Badge variant="outline">{call.language.toUpperCase()}</Badge>
                    {allAgents ? (
                      <span className="text-xs text-muted-foreground">{call.agentName}</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {call.summary || "No summary yet."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Duration {formatDuration(call.durationSec)} · {call.callType}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCallId(call.id)}
                >
                  View details
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No calls yet</CardTitle>
            <CardDescription>
              When callers use this receptionist, short summaries will show up here.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {listQuery.data && listQuery.data.total > listQuery.data.pageSize ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <Sheet open={Boolean(selectedCallId)} onOpenChange={(open) => !open && setSelectedCallId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Call details</SheetTitle>
            <SheetDescription>
              {detailQuery.data
                ? `${detailQuery.data.agentName} · ${new Date(detailQuery.data.startedAt).toLocaleString()}`
                : "Loading call details"}
            </SheetDescription>
          </SheetHeader>

          {detailQuery.isLoading ? (
            <Skeleton className="mt-6 h-48 w-full rounded-xl" />
          ) : detailQuery.data ? (
            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={outcomeVariant(detailQuery.data.outcome)}>
                  {detailQuery.data.outcome}
                </Badge>
                <Badge variant="outline">{detailQuery.data.language.toUpperCase()}</Badge>
                <Badge variant="outline">
                  {formatDuration(detailQuery.data.durationSec)}
                </Badge>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
                <p className="mt-2 text-sm">
                  {detailQuery.data.summary || "No summary recorded for this call."}
                </p>
              </div>
              {detailQuery.data.booking ? (
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Booking</p>
                  <p className="mt-2 text-sm font-medium">
                    {detailQuery.data.booking.serviceName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {detailQuery.data.booking.callerName} ·{" "}
                    {detailQuery.data.booking.callerContact}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(detailQuery.data.booking.startTime).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Code {detailQuery.data.booking.confirmationCode} ·{" "}
                    {detailQuery.data.booking.status}
                  </p>
                </div>
              ) : null}
              {detailQuery.data.handoff ? (
                <div className="rounded-lg border p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Handoff</p>
                  <p className="mt-2 text-sm font-medium">{detailQuery.data.handoff.reason}</p>
                  <p className="text-sm text-muted-foreground">
                    {detailQuery.data.handoff.callerName} ·{" "}
                    {detailQuery.data.handoff.callerContact}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Telegram {detailQuery.data.handoff.status}
                    {detailQuery.data.handoff.deliveredAt
                      ? ` · ${new Date(detailQuery.data.handoff.deliveredAt).toLocaleString()}`
                      : ""}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Call details unavailable.</p>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
