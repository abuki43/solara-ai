import { AgentRequiredPlaceholder } from "@/components/dashboard/placeholder-page";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function VoicePage() {
  return (
    <DashboardShell title="Voice" description="Languages, greeting, and tone">
      <AgentRequiredPlaceholder
        title="Voice configuration"
        description="Configure languages, voice, greeting, and tone for the selected agent."
      />
    </DashboardShell>
  );
}
