"use client";

import Link from "next/link";

import { useSelectedAgentId } from "@/components/dashboard/agent-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">This section is coming in a later sprint.</p>
        <Button asChild variant="outline">
          <Link href="/agents">Back to Agents</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function AgentRequiredPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const selectedAgentId = useSelectedAgentId();

  if (selectedAgentId) {
    return <PlaceholderPage title={title} description={description} />;
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Select an agent from the header dropdown, or create one first.
        </p>
        <Button asChild>
          <Link href="/agents/new">Create agent</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
