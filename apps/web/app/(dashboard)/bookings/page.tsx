import { BookingsPageContent } from "@/components/bookings/bookings-page-content";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function BookingsPage() {
  return (
    <DashboardShell
      title="Bookings"
      description="Manage appointments, availability, blocked time, and delivery status"
    >
      <BookingsPageContent />
    </DashboardShell>
  );
}
