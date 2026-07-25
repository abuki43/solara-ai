import { AgentsPageContent } from "@/components/agents/agents-page-content";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function AgentsPage() {
  return (
    <DashboardShell title="Agents" description="Manage your AI receptionists">
      <AgentsPageContent />
    </DashboardShell>
  );
}
