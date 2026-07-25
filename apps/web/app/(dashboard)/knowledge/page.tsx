import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { KnowledgePageContent } from "@/components/knowledge/knowledge-page-content";

export default function KnowledgePage() {
  return (
    <DashboardShell title="Knowledge" description="Hours, services, FAQs, and business facts">
      <KnowledgePageContent />
    </DashboardShell>
  );
}
