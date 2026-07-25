import { AgentRequiredPlaceholder } from "@/components/dashboard/placeholder-page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function FilesPage() {
  return (
    <DashboardShell title="Files" description="Upload reference documents">
      <AgentRequiredPlaceholder
        title="Files"
        description="Upload up to 5 files (max 2MB each) for the selected agent."
      />
    </DashboardShell>
  );
}
