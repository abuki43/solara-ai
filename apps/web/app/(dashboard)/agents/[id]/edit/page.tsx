import { AgentWizard } from "@/components/agents/agent-wizard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <DashboardShell title="Edit agent" description="Update agent setup">
      <AgentWizard mode="edit" agentId={id} />
    </DashboardShell>
  );
}
