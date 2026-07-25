import Link from "next/link";

import { AgentWizard } from "@/components/agents/agent-wizard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell title="Edit agent" description="Update agent setup">
      <div className="space-y-6">
        <AgentWizard mode="edit" agentId={id} />
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Call configuration moved</CardTitle>
            <CardDescription>
              Greeting and voice live in Voice. Hours, services, FAQs, and about text live in
              Knowledge. Uploads live in Files.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/voice">Open Voice</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/knowledge">Open Knowledge</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/files">Open Files</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
