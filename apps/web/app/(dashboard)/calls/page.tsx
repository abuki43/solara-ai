import { CallsPageContent } from "@/components/calls/calls-page-content";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function CallsPage() {
  return (
    <DashboardShell title="Calls" description="Call history and summaries">
      <CallsPageContent />
    </DashboardShell>
  );
}
