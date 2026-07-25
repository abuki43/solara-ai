"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/providers";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

type Hours = Record<string, { open: string | null; close: string | null; closed: boolean }>;
type Service = {
  id: string;
  name: string;
  price: number;
  currency: string;
  durationMinutes: number;
  bookable: boolean;
};

export function AgentBasicConfig({ agentId }: { agentId: string }) {
  const utils = trpc.useUtils();
  const { data: agent, isLoading } = trpc.agent.get.useQuery({ id: agentId });
  const [greeting, setGreeting] = useState("");
  const [hours, setHours] = useState<Hours>({});
  const [services, setServices] = useState<Service[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = trpc.agent.update.useMutation({
    onSuccess: async () => {
      await utils.agent.get.invalidate({ id: agentId });
      await utils.agent.list.invalidate();
      setSaved(true);
    },
  });

  useEffect(() => {
    if (!agent) return;
    setGreeting(agent.greeting ?? "");
    setHours(agent.hours);
    setServices(agent.services);
  }, [agent]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full max-w-3xl rounded-xl" />;
  }

  function updateDay(
    day: string,
    patch: Partial<{ open: string | null; close: string | null; closed: boolean }>,
  ) {
    setHours((current) => ({
      ...current,
      [day]: {
        open: current[day]?.open ?? "09:00",
        close: current[day]?.close ?? "17:00",
        closed: current[day]?.closed ?? false,
        ...patch,
      },
    }));
  }

  function updateService(index: number, patch: Partial<Service>) {
    setServices((current) =>
      current.map((service, serviceIndex) =>
        serviceIndex === index ? { ...service, ...patch } : service,
      ),
    );
  }

  async function save() {
    setSaved(false);
    setError(null);
    if (
      services.some(
        (service) =>
          !service.name.trim() ||
          service.durationMinutes < 15 ||
          service.durationMinutes > 480 ||
          service.durationMinutes % 15 !== 0,
      )
    ) {
      setError("Every service needs a name and a duration from 15–480 minutes in 15-minute steps.");
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: agentId, greeting, hours, services });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save call knowledge");
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Call knowledge</CardTitle>
        <CardDescription>
          These basics are used immediately when this receptionist answers a call.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="greeting">Greeting</Label>
          <Textarea
            id="greeting"
            value={greeting}
            onChange={(event) => setGreeting(event.target.value)}
            rows={3}
            placeholder="Thank you for calling our salon. You've reached customer support. How can I help you today?"
          />
          <p className="text-xs text-muted-foreground">
            Spoken at the start of every call. Keep it short and natural.
          </p>
        </div>

        <div className="space-y-3">
          <Label>Opening hours</Label>
          <div className="rounded-lg border">
            {DAYS.map((day) => {
              const value = hours[day] ?? { open: "09:00", close: "17:00", closed: false };
              return (
                <div
                  key={day}
                  className="grid gap-3 border-b p-3 last:border-b-0 sm:grid-cols-[110px_1fr_1fr_auto] sm:items-center"
                >
                  <span className="text-sm capitalize">{day}</span>
                  <Input
                    type="time"
                    value={value.open ?? ""}
                    disabled={value.closed}
                    onChange={(event) => updateDay(day, { open: event.target.value })}
                  />
                  <Input
                    type="time"
                    value={value.close ?? ""}
                    disabled={value.closed}
                    onChange={(event) => updateDay(day, { close: event.target.value })}
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={value.closed}
                      onChange={(event) => updateDay(day, { closed: event.target.checked })}
                    />
                    Closed
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Services</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={services.length >= 20}
              onClick={() =>
                setServices((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    price: 0,
                    currency: "ETB",
                    durationMinutes: 30,
                    bookable: true,
                  },
                ])
              }
            >
              <Plus className="mr-1 size-4" />
              Add service
            </Button>
          </div>
          <div className="space-y-3">
            {services.map((service, index) => (
              <div key={service.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_100px_85px_110px_90px_44px]">
                <Input
                  value={service.name}
                  onChange={(event) => updateService(index, { name: event.target.value })}
                  placeholder="Service name"
                />
                <Input
                  type="number"
                  min={0}
                  value={service.price}
                  onChange={(event) => updateService(index, { price: Number(event.target.value) })}
                  aria-label="Price"
                />
                <Input
                  value={service.currency}
                  onChange={(event) => updateService(index, { currency: event.target.value })}
                  aria-label="Currency"
                />
                <Input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={service.durationMinutes}
                  onChange={(event) =>
                    updateService(index, { durationMinutes: Number(event.target.value) })
                  }
                  aria-label="Duration in minutes"
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={service.bookable}
                    onChange={(event) => updateService(index, { bookable: event.target.checked })}
                  />
                  Bookable
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setServices((current) => current.filter((_, serviceIndex) => serviceIndex !== index))
                  }
                  aria-label={`Remove ${service.name || "service"}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex items-center gap-3">
          <Button type="button" disabled={updateMutation.isPending} onClick={save}>
            {updateMutation.isPending ? "Saving..." : "Save call knowledge"}
          </Button>
          {saved ? <span className="text-sm text-emerald-600">Saved.</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
