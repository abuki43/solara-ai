import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { TelegramToolCard } from "@/components/tools/telegram-tool-card";

export default function ToolsPage() {
  return (
    <DashboardShell title="Tools" description="Agent capabilities">
      <TelegramToolCard />
    </DashboardShell>
  );
}
