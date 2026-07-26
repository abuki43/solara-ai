import { BillingPageContent } from "@/components/billing/billing-page-content";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function BillingPage() {
  return (
    <DashboardShell
      title="Billing"
      description="Subscription, usage, and invoices (demo data)"
    >
      <BillingPageContent />
    </DashboardShell>
  );
}
