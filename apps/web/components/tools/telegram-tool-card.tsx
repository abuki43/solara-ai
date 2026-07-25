"use client";

import { CheckCircle2, ExternalLink, MessageCircle, Send, Unplug } from "lucide-react";
import { useEffect, useState } from "react";

import { useSelectedAgentId } from "@/components/dashboard/agent-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/providers";

export function TelegramToolCard() {
  const agentId = useSelectedAgentId();
  const utils = trpc.useUtils();
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const statusQuery = trpc.telegram.getStatus.useQuery(
    { agentId },
    {
      enabled: Boolean(agentId),
      refetchInterval: connectUrl ? 3000 : false,
    },
  );

  useEffect(() => {
    if (statusQuery.data?.connected) setConnectUrl(null);
  }, [statusQuery.data?.connected]);

  const createLink = trpc.telegram.createConnectLink.useMutation({
    onSuccess(data) {
      setConnectUrl(data.url);
      setFeedback(`Open @${data.botUsername} and press Start. This link expires in 10 minutes.`);
    },
  });
  const setEnabled = trpc.telegram.setEnabled.useMutation({
    async onSuccess() {
      await utils.telegram.getStatus.invalidate({ agentId });
    },
  });
  const sendTest = trpc.telegram.sendTest.useMutation({
    onSuccess() {
      setFeedback("Test message delivered to Telegram.");
    },
  });
  const disconnect = trpc.telegram.disconnect.useMutation({
    async onSuccess() {
      setConnectUrl(null);
      setFeedback("Telegram disconnected.");
      await utils.telegram.getStatus.invalidate();
    },
  });

  if (!agentId) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Choose a receptionist</CardTitle>
          <CardDescription>Select a receptionist in the header before configuring tools.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (statusQuery.isLoading) {
    return <Skeleton className="h-72 w-full max-w-2xl rounded-xl" />;
  }

  const status = statusQuery.data;
  const mutationError =
    createLink.error || setEnabled.error || sendTest.error || disconnect.error || statusQuery.error;

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10">
              <MessageCircle className="size-5 text-sky-600" />
            </div>
            <div>
              <CardTitle>Telegram handoff</CardTitle>
              <CardDescription className="mt-1">
                Deliver unresolved customer requests to your Telegram chat.
              </CardDescription>
            </div>
          </div>
          <Badge variant={status?.connected ? "default" : "secondary"}>
            {status?.connected ? "Connected" : "Not connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!status?.configured ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Telegram is not configured on the server.
          </p>
        ) : null}

        {status?.connected && status.connection ? (
          <>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-4">
              <CheckCircle2 className="size-5 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {status.connection.chatTitle || "Telegram chat"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {status.connection.username ? `@${status.connection.username} · ` : ""}
                  {status.connection.chatType}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() =>
                  setEnabled.mutate({ agentId, enabled: !status.enabled })
                }
                disabled={setEnabled.isPending}
              >
                {status.enabled ? "Disable handoffs" : "Enable handoffs"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => sendTest.mutate({ agentId })}
                disabled={sendTest.isPending}
              >
                <Send className="size-4" />
                {sendTest.isPending ? "Sending..." : "Send test"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-muted-foreground"
                onClick={() => {
                  if (window.confirm("Disconnect Telegram for this organization?")) {
                    disconnect.mutate();
                  }
                }}
                disabled={disconnect.isPending}
              >
                <Unplug className="size-4" />
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect once through Telegram. You never need to copy a chat ID or share a bot token.
            </p>
            {!connectUrl ? (
              <Button
                type="button"
                disabled={!status?.configured || createLink.isPending}
                onClick={() => createLink.mutate({ agentId })}
              >
                {createLink.isPending ? "Creating link..." : "Connect Telegram"}
              </Button>
            ) : (
              <Button asChild className="gap-2">
                <a href={connectUrl} target="_blank" rel="noreferrer">
                  Open Telegram
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            )}
          </div>
        )}

        {status?.connected ? (
          <p className="text-xs text-muted-foreground">
            Handoffs are currently <strong>{status.enabled ? "enabled" : "disabled"}</strong> for
            the selected receptionist.
          </p>
        ) : null}
        {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}
        {mutationError ? (
          <p role="alert" className="text-sm text-destructive">
            {mutationError.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
