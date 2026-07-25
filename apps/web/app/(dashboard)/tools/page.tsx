import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { BookingToolCard } from "@/components/tools/booking-tool-card";
import { TelegramToolCard } from "@/components/tools/telegram-tool-card";

export default function ToolsPage() {
  return (
    <DashboardShell title="Tools" description="Agent capabilities">
      <div className="space-y-6">
        <BookingToolCard />
        <TelegramToolCard />
      </div>
    </DashboardShell>
  );
}
