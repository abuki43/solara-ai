import { BookingsPageContent } from "@/components/bookings/bookings-page-content";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function BookingsPage() {
  return (
    <DashboardShell
      title="Bookings"
      description="Set up your calendar, manage appointments, and block unavailable time"
    >
      <BookingsPageContent />
    </DashboardShell>
  );
}
