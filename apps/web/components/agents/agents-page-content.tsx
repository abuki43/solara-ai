"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Pencil, Phone, Trash2 } from "lucide-react";
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

function CopySlugButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/call/${slug}` : `/call/${slug}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleCopy}>
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

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete agent "${name}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync({ id });
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
                  <Link href="/test-call">
                    <Phone className="size-3.5" />
                    Test call
                  </Link>
                </Button>
                <CopySlugButton slug={agent.slug} />
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
    </div>
  );
}
