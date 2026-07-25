"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Pause,
  Pencil,
  Phone,
  Play,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/providers";

const statusLabels = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
} as const;

const statusVariant = {
  draft: "secondary" as const,
  active: "default" as const,
  paused: "outline" as const,
};

function CopySlugButton({ slug, disabled }: { slug: string; disabled: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/call/${slug}` : `/call/${slug}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleCopy}
      disabled={disabled}
      title={disabled ? "Activate this receptionist before sharing its public link" : undefined}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy URL"}
    </Button>
  );
}

export function AgentsPageContent() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: agents, isLoading } = trpc.agent.list.useQuery();

  const deleteMutation = trpc.agent.delete.useMutation({
    onSuccess: () => utils.agent.list.invalidate(),
  });
  const statusMutation = trpc.agent.updateStatus.useMutation({
    onSuccess: () => utils.agent.list.invalidate(),
  });
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete agent "${name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync({ id });
  }

  async function handleStatus(id: string, status: "active" | "paused") {
    setActionError(null);
    try {
      await statusMutation.mutateAsync({ id, status });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update receptionist");
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-52 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!agents?.length) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <CardTitle>No agents yet</CardTitle>
          <CardDescription>
            Create your first AI receptionist to handle customer calls for your business.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button asChild>
            <Link href="/agents/new">Create your first agent</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Manage setup for each AI receptionist in your organization.
          </p>
        </div>
        <Button asChild>
          <Link href="/agents/new">+ Create agent</Link>
        </Button>
      </div>

      <Card className="bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Receptionist setup</CardTitle>
          <CardDescription>
            Browser calling is available in this phase. Connecting a business phone number comes later.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Create receptionist", done: true, href: "/agents" },
            { label: "Review business details", done: false, href: "/settings" },
            {
              label: "Activate",
              done: agents.some((agent) => agent.status === "active"),
              href: "/agents",
            },
            { label: "Test a call", done: false, href: "/agents" },
            {
              label: "Share browser call link",
              done: agents.some((agent) => agent.status === "active"),
              href: "/agents",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-xs transition-colors hover:bg-muted/50"
            >
              {item.done ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <Circle className="size-4 text-muted-foreground" />
              )}
              {item.label}
            </Link>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                <Badge variant={statusVariant[agent.status]}>{statusLabels[agent.status]}</Badge>
              </div>
              <CardDescription>
                {agent.useCase} · {agent.primaryLanguage.toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-xs text-muted-foreground">/call/{agent.slug}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => router.push(`/agents/${agent.id}/edit`)}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link href={`/test-call?agentId=${agent.id}`}>
                    <Phone className="size-3.5" />
                    Test call
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant={agent.status === "active" ? "outline" : "default"}
                  size="sm"
                  className="gap-1.5"
                  disabled={statusMutation.isPending}
                  onClick={() =>
                    handleStatus(agent.id, agent.status === "active" ? "paused" : "active")
                  }
                >
                  {agent.status === "active" ? (
                    <Pause className="size-3.5" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  {agent.status === "active" ? "Pause" : "Activate"}
                </Button>
                <CopySlugButton slug={agent.slug} disabled={agent.status !== "active"} />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleDelete(agent.id, agent.name)}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {actionError ? (
        <p role="alert" className="text-sm text-destructive">
          {actionError}
        </p>
      ) : null}
    </div>
  );
}
