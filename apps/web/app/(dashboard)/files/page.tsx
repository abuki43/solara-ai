import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FilesPageContent } from "@/components/files/files-page-content";

export default function FilesPage() {
  return (
    <DashboardShell title="Files" description="Upload small documents for this receptionist">
      <FilesPageContent />
    </DashboardShell>
  );
}
