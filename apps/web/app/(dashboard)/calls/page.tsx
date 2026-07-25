import { AgentRequiredPlaceholder } from "@/components/dashboard/placeholder-page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function CallsPage() {
  return (
    <DashboardShell title="Calls" description="Call history and transcripts">
      <AgentRequiredPlaceholder
        title="Call logs"
        description="View call summaries and transcripts for the selected agent."
      />
    </DashboardShell>
  );
}
