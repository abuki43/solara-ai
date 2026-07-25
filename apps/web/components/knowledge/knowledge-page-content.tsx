"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useSelectedAgentId } from "@/components/dashboard/agent-selector";
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

export function KnowledgePageContent() {
  const agentId = useSelectedAgentId();
  const utils = trpc.useUtils();
  const knowledgeQuery = trpc.knowledge.get.useQuery({ agentId }, { enabled: Boolean(agentId) });
  const faqsQuery = trpc.faq.list.useQuery({ agentId }, { enabled: Boolean(agentId) });

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [hours, setHours] = useState<Hours>({});
  const [services, setServices] = useState<Service[]>([]);
  const [aboutText, setAboutText] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [faqDraft, setFaqDraft] = useState({ question: "", answer: "" });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!knowledgeQuery.data) return;
    setBusinessName(knowledgeQuery.data.agent.businessName || knowledgeQuery.data.organization.name);
    setPhone(knowledgeQuery.data.organization.phone ?? "");
    setAddress(knowledgeQuery.data.organization.address ?? "");
    setWebsite(knowledgeQuery.data.organization.website ?? "");
    setHours(knowledgeQuery.data.agent.hours);
    setServices(knowledgeQuery.data.agent.services);
    setAboutText(knowledgeQuery.data.agent.aboutText ?? "");
    setCustomInstructions(knowledgeQuery.data.agent.customInstructions ?? "");
  }, [knowledgeQuery.data]);

  const invalidate = async () => {
    await Promise.all([
      utils.knowledge.get.invalidate({ agentId }),
      utils.faq.list.invalidate({ agentId }),
      utils.agent.get.invalidate(),
      utils.booking.getStatus.invalidate({ agentId }),
    ]);
  };

  const updateBusiness = trpc.knowledge.updateBusiness.useMutation({ onSuccess: invalidate });
  const updateHours = trpc.knowledge.updateHours.useMutation({ onSuccess: invalidate });
  const updateServices = trpc.knowledge.updateServices.useMutation({ onSuccess: invalidate });
  const updateAbout = trpc.knowledge.updateAbout.useMutation({ onSuccess: invalidate });
  const createFaq = trpc.faq.create.useMutation({ onSuccess: invalidate });
  const deleteFaq = trpc.faq.delete.useMutation({ onSuccess: invalidate });
  const reorderFaq = trpc.faq.reorder.useMutation({ onSuccess: invalidate });

  const promptPreview = useMemo(
    () => knowledgeQuery.data?.promptPreview ?? "",
    [knowledgeQuery.data?.promptPreview],
  );

  if (!agentId) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Choose a receptionist</CardTitle>
          <CardDescription>
            Select a receptionist in the header before editing knowledge.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (knowledgeQuery.isLoading || !knowledgeQuery.data) {
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

  function copyMondayToWeekdays() {
    const monday = hours.monday ?? { open: "09:00", close: "17:00", closed: false };
    setHours((current) => {
      const next = { ...current };
      for (const day of ["tuesday", "wednesday", "thursday", "friday"] as const) {
        next[day] = { ...monday };
      }
      return next;
    });
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setError(null);
    setFeedback(null);
    try {
      await action();
      setFeedback(success);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save knowledge");
    }
  }

  async function moveFaq(index: number, direction: -1 | 1) {
    if (!faqsQuery.data) return;
    const orderedIds = faqsQuery.data.map((faq) => faq.id);
    const target = index + direction;
    if (target < 0 || target >= orderedIds.length) return;
    const swap = orderedIds[index]!;
    orderedIds[index] = orderedIds[target]!;
    orderedIds[target] = swap;
    await run(() => reorderFaq.mutateAsync({ agentId, orderedIds }), "FAQ order updated.");
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business info</CardTitle>
          <CardDescription>
            Spoken business name is per receptionist. Phone, address, and website update your
            organization profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="business-name">Spoken business name</Label>
            <Input
              id="business-name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address / area</Label>
            <Input
              id="address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={updateBusiness.isPending}
            onClick={() =>
              run(
                () =>
                  updateBusiness.mutateAsync({
                    agentId,
                    businessName,
                    phone: phone || null,
                    address: address || null,
                    website: website || null,
                  }),
                "Business info saved.",
              )
            }
          >
            Save business info
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Opening hours</CardTitle>
              <CardDescription>Used for answers and booking slot generation.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={copyMondayToWeekdays}>
              Copy Monday to weekdays
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
          <Button
            type="button"
            disabled={updateHours.isPending}
            onClick={() =>
              run(() => updateHours.mutateAsync({ agentId, hours }), "Hours saved.")
            }
          >
            Save hours
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Services & prices</CardTitle>
              <CardDescription>Max 20 services. Duration must be in 15-minute steps.</CardDescription>
            </div>
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
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {services.map((service, index) => (
              <div
                key={service.id}
                className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_90px_70px_100px_90px_44px]"
              >
                <Input
                  value={service.name}
                  onChange={(event) =>
                    setServices((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, name: event.target.value } : row,
                      ),
                    )
                  }
                  placeholder="Service name"
                />
                <Input
                  type="number"
                  min={0}
                  value={service.price}
                  onChange={(event) =>
                    setServices((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, price: Number(event.target.value) } : row,
                      ),
                    )
                  }
                />
                <Input
                  value={service.currency}
                  onChange={(event) =>
                    setServices((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, currency: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={service.durationMinutes}
                  onChange={(event) =>
                    setServices((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index
                          ? { ...row, durationMinutes: Number(event.target.value) }
                          : row,
                      ),
                    )
                  }
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={service.bookable}
                    onChange={(event) =>
                      setServices((current) =>
                        current.map((row, rowIndex) =>
                          rowIndex === index ? { ...row, bookable: event.target.checked } : row,
                        ),
                      )
                    }
                  />
                  Bookable
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setServices((current) => current.filter((_, rowIndex) => rowIndex !== index))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            disabled={updateServices.isPending}
            onClick={() =>
              run(() => updateServices.mutateAsync({ agentId, services }), "Services saved.")
            }
          >
            Save services
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FAQ</CardTitle>
          <CardDescription>Max 20 Q&A pairs. Use arrows to reorder.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {(faqsQuery.data ?? []).map((faq, index) => (
              <div key={faq.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{faq.question}</p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={index === 0 || reorderFaq.isPending}
                      onClick={() => moveFaq(index, -1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={
                        !faqsQuery.data ||
                        index === faqsQuery.data.length - 1 ||
                        reorderFaq.isPending
                      }
                      onClick={() => moveFaq(index, 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        run(
                          () => deleteFaq.mutateAsync({ agentId, faqId: faq.id }),
                          "FAQ deleted.",
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <Input
              placeholder="Question"
              value={faqDraft.question}
              onChange={(event) =>
                setFaqDraft((current) => ({ ...current, question: event.target.value }))
              }
            />
            <Textarea
              placeholder="Answer"
              value={faqDraft.answer}
              onChange={(event) =>
                setFaqDraft((current) => ({ ...current, answer: event.target.value }))
              }
            />
            <Button
              type="button"
              disabled={createFaq.isPending || !faqDraft.question.trim() || !faqDraft.answer.trim()}
              onClick={() =>
                run(async () => {
                  await createFaq.mutateAsync({
                    agentId,
                    question: faqDraft.question.trim(),
                    answer: faqDraft.answer.trim(),
                  });
                  setFaqDraft({ question: "", answer: "" });
                }, "FAQ added.")
              }
            >
              Add FAQ
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About & instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="about">About the business</Label>
            <Textarea
              id="about"
              rows={5}
              maxLength={4000}
              value={aboutText}
              onChange={(event) => setAboutText(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructions">Special instructions</Label>
            <Textarea
              id="instructions"
              rows={4}
              maxLength={2000}
              value={customInstructions}
              onChange={(event) => setCustomInstructions(event.target.value)}
            />
          </div>
          <Button
            type="button"
            disabled={updateAbout.isPending}
            onClick={() =>
              run(
                () =>
                  updateAbout.mutateAsync({
                    agentId,
                    aboutText: aboutText || null,
                    customInstructions: customInstructions || null,
                  }),
                "About text saved.",
              )
            }
          >
            Save about & instructions
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt preview</CardTitle>
          <CardDescription>
            Base prompt used for calls before booking/Telegram tool instructions are appended.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-xs">
            {promptPreview}
          </pre>
        </CardContent>
      </Card>

      {feedback ? <p className="text-sm text-emerald-600">{feedback}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
