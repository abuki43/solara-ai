import { AgentWizard } from "@/components/agents/agent-wizard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function NewAgentPage() {
  return (
    <DashboardShell title="Create agent" description="Set up a new AI receptionist">
      <AgentWizard mode="create" />
    </DashboardShell>
  );
}
