import { AgentRequiredPlaceholder } from "@/components/dashboard/placeholder-page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function KnowledgePage() {
  return (
    <DashboardShell title="Knowledge" description="FAQs and business context">
      <AgentRequiredPlaceholder
        title="Knowledge base"
        description="Add FAQs and business knowledge for the selected agent."
      />
    </DashboardShell>
  );
}
