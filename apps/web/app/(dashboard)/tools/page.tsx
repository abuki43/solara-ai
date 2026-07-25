import { AgentRequiredPlaceholder } from "@/components/dashboard/placeholder-page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function ToolsPage() {
  return (
    <DashboardShell title="Tools" description="Agent capabilities">
      <AgentRequiredPlaceholder
        title="Tools"
        description="Configure tools and integrations for the selected agent."
      />
    </DashboardShell>
  );
}
