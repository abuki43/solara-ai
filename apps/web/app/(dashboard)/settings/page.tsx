import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SettingsPageContent } from "@/components/settings/settings-page-content";

export default function SettingsPage() {
  return (
    <DashboardShell title="Settings" description="Business profile and account">
      <SettingsPageContent />
    </DashboardShell>
  );
}
