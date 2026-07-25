import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { VoicePageContent } from "@/components/voice/voice-page-content";

export default function VoicePage() {
  return (
    <DashboardShell title="Voice" description="Languages, greeting, and tone">
      <VoicePageContent />
    </DashboardShell>
  );
}
