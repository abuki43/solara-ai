"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/providers";
import { cn } from "@/lib/utils";

type UseCase = "salon" | "clinic" | "restaurant" | "general";
type Language = "en" | "am" | "om";

const useCases: { value: UseCase; label: string; description: string }[] = [
  { value: "salon", label: "Salon", description: "Hair, beauty, and spa services" },
  { value: "clinic", label: "Clinic", description: "Medical appointments and inquiries" },
  { value: "restaurant", label: "Restaurant", description: "Reservations and menu questions" },
  { value: "general", label: "General", description: "Any local business" },
];

const languages: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "am", label: "Amharic" },
  { value: "om", label: "Afan Oromo" },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

type AgentWizardProps = {
  mode: "create" | "edit";
  agentId?: string;
};

export function AgentWizard({ mode, agentId }: AgentWizardProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: existingAgent, isLoading: isLoadingAgent } = trpc.agent.get.useQuery(
    { id: agentId! },
    { enabled: mode === "edit" && !!agentId },
  );

  const createMutation = trpc.agent.create.useMutation({
    onSuccess: (agent) => {
      utils.agent.list.invalidate();
      localStorage.setItem("solar-ai-selected-agent", agent!.id);
      router.push("/agents");
    },
  });

  const updateMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      utils.agent.list.invalidate();
      if (agentId) utils.agent.get.invalidate({ id: agentId });
      router.push("/agents");
    },
  });

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [useCase, setUseCase] = useState<UseCase>("salon");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [primaryLanguage, setPrimaryLanguage] = useState<Language>("en");
  const [additionalLanguages, setAdditionalLanguages] = useState<Language[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existingAgent) {
      setName(existingAgent.name);
      setDescription(existingAgent.description ?? "");
      setUseCase(existingAgent.useCase);
      setSlug(existingAgent.slug);
      setSlugTouched(true);
      setPrimaryLanguage(existingAgent.primaryLanguage);
      setAdditionalLanguages((existingAgent.additionalLanguages ?? []) as Language[]);
    }
  }, [existingAgent]);

  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  function toggleAdditionalLanguage(language: Language) {
    if (language === primaryLanguage) return;
    setAdditionalLanguages((current) =>
      current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language],
    );
  }

  async function handleSubmit() {
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      useCase,
      slug: slug.trim(),
      primaryLanguage,
      additionalLanguages: additionalLanguages.filter((lang) => lang !== primaryLanguage),
    };

    try {
      if (mode === "create") {
        await createMutation.mutateAsync(payload);
      } else if (agentId) {
        await updateMutation.mutateAsync({ id: agentId, ...payload });
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save agent");
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (mode === "edit" && isLoadingAgent) {
    return <Skeleton className="h-96 w-full max-w-2xl rounded-xl" />;
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{mode === "create" ? "New agent" : "Edit agent"}</CardTitle>
        <CardDescription>Step {step} of 3</CardDescription>
        <div className="flex gap-2 pt-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full",
                s <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent name</Label>
              <Input
                id="agent-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Main Receptionist"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-description">Description (optional)</Label>
              <Textarea
                id="agent-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Internal notes about this agent"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Use case</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {useCases.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setUseCase(item.value)}
                    className={cn(
                      "rounded-lg border p-4 text-left transition-colors",
                      useCase === item.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50",
                    )}
                  >
                    <strong className="text-sm">{item.label}</strong>
                    <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-slug">URL slug</Label>
              <Input
                id="agent-slug"
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(event.target.value);
                }}
                placeholder="main-receptionist"
              />
              <p className="text-xs text-muted-foreground">Public call URL: /call/{slug || "your-slug"}</p>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary-language">Primary language</Label>
              <Select
                value={primaryLanguage}
                onValueChange={(value) => {
                  const lang = value as Language;
                  setPrimaryLanguage(lang);
                  setAdditionalLanguages((current) => current.filter((l) => l !== lang));
                }}
              >
                <SelectTrigger id="primary-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional languages (optional)</Label>
              <div className="flex flex-wrap gap-3">
                {languages
                  .filter((language) => language.value !== primaryLanguage)
                  .map((language) => (
                    <label key={language.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={additionalLanguages.includes(language.value)}
                        onChange={() => toggleAdditionalLanguage(language.value)}
                        className="rounded border-input"
                      />
                      {language.label}
                    </label>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Voice selection happens in the Voice menu after setup.
              </p>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <p>
              <strong>Name:</strong> {name}
            </p>
            <p>
              <strong>Use case:</strong> {useCase}
            </p>
            <p>
              <strong>Slug:</strong> {slug}
            </p>
            <p>
              <strong>Primary language:</strong> {primaryLanguage}
            </p>
            <p>
              <strong>Additional languages:</strong>{" "}
              {additionalLanguages.length ? additionalLanguages.join(", ") : "None"}
            </p>
            <p>
              <strong>Status after save:</strong> Draft
            </p>
            <p className="text-xs text-muted-foreground">
              Configure voice, knowledge, and tools from the sidebar menus after creating this agent.
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex justify-between gap-2 pt-2">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          ) : (
            <div />
          )}
          {step < 3 ? (
            <Button
              type="button"
              disabled={step === 1 && (!name.trim() || !slug.trim())}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button type="button" disabled={isSaving} onClick={handleSubmit}>
              {isSaving ? "Saving..." : mode === "create" ? "Create agent" : "Save changes"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
