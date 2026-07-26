"use client";

import { Check, CreditCard, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CURRENT_PLAN_ID = "growth" as const;

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "~ETB 7,000",
    period: "/mo",
    industries: "restaurants · clinics · shops",
    features: "1 agent · 500 min included · single-line businesses",
    includedMinutes: 500,
    agents: 1,
  },
  {
    id: "growth",
    name: "Growth",
    price: "~ETB 21,000",
    period: "/mo",
    industries: "hotels · delivery · MFIs",
    features: "3 agents · 2,000 min · booking & CRM integrations · analytics",
    includedMinutes: 2000,
    agents: 3,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "",
    industries: "banks · telcos · gov",
    features: "Dedicated capacity, SLAs, on-prem options, custom integrations",
    includedMinutes: null,
    agents: null,
  },
] as const;

const USAGE = {
  minutesUsed: 1_284,
  minutesIncluded: 2_000,
  agentsUsed: 2,
  agentsIncluded: 3,
  overageMinutes: 0,
  billingPeriodLabel: "Jul 1 – Jul 31, 2026",
  nextInvoiceDate: "Aug 1, 2026",
  paymentMethod: "Invoice · Bank transfer",
};

const INVOICES = [
  { id: "INV-2026-07", date: "Jul 1, 2026", amount: "ETB 21,000", status: "Paid" as const },
  { id: "INV-2026-06", date: "Jun 1, 2026", amount: "ETB 21,000", status: "Paid" as const },
  { id: "INV-2026-05", date: "May 1, 2026", amount: "ETB 21,000", status: "Paid" as const },
  { id: "INV-2026-04", date: "Apr 1, 2026", amount: "ETB 18,400", status: "Paid" as const },
];

function UsageMeter({
  label,
  used,
  included,
  unit,
}: {
  label: string;
  used: number;
  included: number;
  unit: string;
}) {
  const pct = Math.min(100, Math.round((used / included) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used.toLocaleString()} / {included.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 90 ? "bg-amber-500" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function BillingPageContent() {
  const currentPlan = PLANS.find((plan) => plan.id === CURRENT_PLAN_ID)!;
  const minutesPct = Math.round((USAGE.minutesUsed / USAGE.minutesIncluded) * 100);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-primary/30 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Current plan</CardTitle>
              <Badge>Growth</Badge>
              <Badge variant="outline" className="text-muted-foreground">
                Demo
              </Badge>
            </div>
            <CardDescription>{USAGE.billingPeriodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-3xl font-semibold tracking-tight">
                {currentPlan.price}
                <span className="text-base font-normal text-muted-foreground">{currentPlan.period}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{currentPlan.industries}</p>
            </div>

            <UsageMeter
              label="Voice minutes"
              used={USAGE.minutesUsed}
              included={USAGE.minutesIncluded}
              unit="min"
            />
            <UsageMeter
              label="Receptionists"
              used={USAGE.agentsUsed}
              included={USAGE.agentsIncluded}
              unit="agents"
            />

            <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Next invoice</p>
                <p className="font-medium">{USAGE.nextInvoiceDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment method</p>
                <p className="flex items-center gap-1.5 font-medium">
                  <CreditCard className="size-3.5 text-muted-foreground" />
                  {USAGE.paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Overage this period</p>
                <p className="font-medium">{USAGE.overageMinutes} min</p>
              </div>
              <div>
                <p className="text-muted-foreground">Usage</p>
                <p className="font-medium">{minutesPct}% of included minutes</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled>
                Manage payment
              </Button>
              <Button type="button" variant="outline" disabled>
                Download invoice
              </Button>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Billing is demo-only. Stripe and live invoicing are not connected yet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan includes</CardTitle>
            <CardDescription>What&apos;s on your Growth subscription</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {[
                "3 AI receptionists",
                "2,000 voice minutes / month",
                "Booking & Telegram tools",
                "Call summaries & analytics",
                "Public call link + embed widget",
                "Email & invoice support",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Available plans
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === CURRENT_PLAN_ID;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative overflow-hidden transition-shadow",
                  isCurrent && "border-primary bg-primary text-primary-foreground shadow-md",
                )}
              >
                {isCurrent ? (
                  <div className="absolute right-3 top-3">
                    <Badge variant="secondary" className="bg-primary-foreground/15 text-primary-foreground">
                      Current
                    </Badge>
                  </div>
                ) : null}
                <CardHeader className="pb-2">
                  <CardTitle className={cn("text-lg", !isCurrent && "text-primary")}>{plan.name}</CardTitle>
                  <CardDescription className={cn(isCurrent && "text-primary-foreground/80")}>
                    {plan.industries}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-2xl font-semibold">
                    {plan.price}
                    {plan.period ? (
                      <span
                        className={cn(
                          "text-sm font-normal",
                          isCurrent ? "text-primary-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {plan.period}
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      isCurrent ? "text-primary-foreground/90" : "text-muted-foreground",
                    )}
                  >
                    {plan.features}
                  </p>
                  <Button
                    type="button"
                    variant={isCurrent ? "secondary" : "outline"}
                    className="w-full"
                    disabled
                  >
                    {isCurrent ? "Current plan" : "Contact sales"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice history</CardTitle>
          <CardDescription>Sample invoices for demo purposes</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Invoice</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-b-0">
                    <td className="px-6 py-3 font-medium">{invoice.id}</td>
                    <td className="px-6 py-3 text-muted-foreground">{invoice.date}</td>
                    <td className="px-6 py-3">{invoice.amount}</td>
                    <td className="px-6 py-3">
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        {invoice.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Button type="button" variant="ghost" size="sm" disabled>
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
