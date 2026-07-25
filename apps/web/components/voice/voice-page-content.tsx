"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useSelectedAgentId } from "@/components/dashboard/agent-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/providers";

const TONES = [
  { id: "friendly", label: "Friendly", description: "Warm and conversational" },
  { id: "professional", label: "Professional", description: "Formal and concise" },
  { id: "casual", label: "Casual", description: "Relaxed short sentences" },
] as const;

export function VoicePageContent() {
  const agentId = useSelectedAgentId();
  const utils = trpc.useUtils();
  const voiceQuery = trpc.voice.get.useQuery({ agentId }, { enabled: Boolean(agentId) });

  const [greeting, setGreeting] = useState("");
  const [tone, setTone] = useState<"friendly" | "professional" | "casual">("friendly");
  const [voiceId, setVoiceId] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const updateMutation = trpc.voice.update.useMutation({
    async onSuccess() {
      await utils.voice.get.invalidate({ agentId });
      setSaved(true);
    },
  });

  useEffect(() => {
    if (!voiceQuery.data) return;
    setGreeting(voiceQuery.data.greeting ?? "");
    setTone(voiceQuery.data.tone);
    setVoiceId(voiceQuery.data.selectedVoiceId);
  }, [voiceQuery.data]);

  const dirty = useMemo(() => {
    if (!voiceQuery.data) return false;
    return (
      greeting !== (voiceQuery.data.greeting ?? "") ||
      tone !== voiceQuery.data.tone ||
      voiceId !== voiceQuery.data.selectedVoiceId
    );
  }, [greeting, tone, voiceId, voiceQuery.data]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  if (!agentId) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Choose a receptionist</CardTitle>
          <CardDescription>Select a receptionist in the header before configuring voice.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (voiceQuery.isLoading || !voiceQuery.data) {
    return <Skeleton className="h-96 w-full max-w-3xl rounded-xl" />;
  }

  async function save() {
    if (!agentId) return;
    setSaved(false);
    setError(null);
    try {
      await updateMutation.mutateAsync({
        agentId,
        greeting,
        tone,
        englishVoiceId: voiceId,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save voice settings");
    }
  }

  async function previewVoice(selectedVoiceId: string) {
    if (!agentId) return;
    setPreviewError(null);
    setPreviewing(true);
    try {
      const response = await fetch("/api/voice/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          voiceId: selectedVoiceId,
          text: greeting.slice(0, 200) || undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Voice preview failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (previewErr) {
      setPreviewError(previewErr instanceof Error ? previewErr.message : "Voice preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Languages</CardTitle>
          <CardDescription>
            English is available now. Change language intent in agent setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge>{voiceQuery.data.primaryLanguage.toUpperCase()}</Badge>
          {voiceQuery.data.additionalLanguages.map((language) => (
            <Badge key={language} variant="secondary">
              {language.toUpperCase()}
            </Badge>
          ))}
          <Button asChild variant="link" className="px-0">
            <Link href={`/agents/${agentId}/edit`}>Change languages in Agents → Edit setup</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>English voice</CardTitle>
          <CardDescription>Choose the Cartesia voice used for browser calls.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {voiceQuery.data.voices.map((voice) => (
            <div
              key={voice.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 ${
                voiceId === voice.id ? "border-primary bg-primary/5" : ""
              }`}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="english-voice"
                  checked={voiceId === voice.id}
                  onChange={() => {
                    setSaved(false);
                    setVoiceId(voice.id);
                  }}
                />
                <div>
                  <p className="font-medium">{voice.name}</p>
                  <p className="text-xs text-muted-foreground">{voice.description}</p>
                </div>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={previewing}
                onClick={() => previewVoice(voice.id)}
              >
                Preview
              </Button>
            </div>
          ))}
          {previewError ? <p className="text-sm text-destructive">{previewError}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Greeting</CardTitle>
          <CardDescription>Spoken at the start of every call. Max 500 characters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={greeting}
            onChange={(event) => {
              setSaved(false);
              setGreeting(event.target.value);
            }}
            rows={4}
            maxLength={500}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSaved(false);
              setGreeting(voiceQuery.data.defaultGreeting);
            }}
          >
            Reset to default
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tone</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {TONES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`rounded-lg border p-4 text-left ${
                tone === option.id ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => {
                setSaved(false);
                setTone(option.id);
              }}
            >
              <Label className="cursor-pointer">{option.label}</Label>
              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-xl border bg-background/95 p-4 shadow-sm backdrop-blur">
        <Button type="button" disabled={updateMutation.isPending || !dirty} onClick={save}>
          {updateMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
        {saved ? <span className="text-sm text-emerald-600">Saved.</span> : null}
        {dirty ? <span className="text-sm text-muted-foreground">Unsaved changes</span> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {updateMutation.error ? (
          <p className="text-sm text-destructive">{updateMutation.error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
