"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/providers";

type CallLanguage = "en" | "am";

export function AgentLanguagesCard({ agentId }: { agentId: string }) {
  const utils = trpc.useUtils();
  const { data: agent, isLoading } = trpc.agent.get.useQuery({ id: agentId });
  const [primaryLanguage, setPrimaryLanguage] = useState<CallLanguage>("en");
  const [alsoAmharic, setAlsoAmharic] = useState(false);
  const [alsoEnglish, setAlsoEnglish] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = trpc.agent.update.useMutation({
    async onSuccess() {
      await utils.agent.get.invalidate({ id: agentId });
      await utils.agent.list.invalidate();
      await utils.voice.get.invalidate({ agentId });
      setSaved(true);
    },
  });

  useEffect(() => {
    if (!agent) return;
    const primary =
      agent.primaryLanguage === "am" || agent.primaryLanguage === "en"
        ? agent.primaryLanguage
        : "en";
    setPrimaryLanguage(primary);
    const additional = agent.additionalLanguages ?? [];
    setAlsoAmharic(primary !== "am" && additional.includes("am"));
    setAlsoEnglish(primary !== "en" && additional.includes("en"));
  }, [agent]);

  if (isLoading) {
    return <Skeleton className="h-56 w-full max-w-3xl rounded-xl" />;
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Call languages</CardTitle>
        <CardDescription>
          Phone short codes: <strong>7856</strong> English · <strong>7855</strong> Amharic. Enable
          both so either code works for this receptionist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="primary-language">Primary language</Label>
          <Select
            value={primaryLanguage}
            onValueChange={(value) => {
              setSaved(false);
              const next = value as CallLanguage;
              setPrimaryLanguage(next);
              if (next === "am") setAlsoAmharic(false);
              if (next === "en") setAlsoEnglish(false);
            }}
          >
            <SelectTrigger id="primary-language" className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="am">Amharic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Also support</Label>
          <div className="flex flex-col gap-2">
            {primaryLanguage !== "am" ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={alsoAmharic}
                  onChange={(event) => {
                    setSaved(false);
                    setAlsoAmharic(event.target.checked);
                  }}
                />
                Amharic (short code 7855)
              </label>
            ) : null}
            {primaryLanguage !== "en" ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={alsoEnglish}
                  onChange={(event) => {
                    setSaved(false);
                    setAlsoEnglish(event.target.checked);
                  }}
                />
                English (short code 7856)
              </label>
            ) : null}
            {primaryLanguage === "en" && !alsoAmharic ? (
              <p className="text-xs text-muted-foreground">
                Only English is enabled. Check Amharic to allow dialing 7855.
              </p>
            ) : null}
            {primaryLanguage === "am" || alsoAmharic ? (
              <p className="text-xs text-muted-foreground">
                Amharic calls need <code>ADDIS_API_KEY</code> and{" "}
                <code>ADDIS_AMHARIC_ENABLED=true</code> on the server.
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            disabled={updateMutation.isPending}
            onClick={async () => {
              setError(null);
              setSaved(false);
              const additionalLanguages: CallLanguage[] = [];
              if (primaryLanguage !== "am" && alsoAmharic) additionalLanguages.push("am");
              if (primaryLanguage !== "en" && alsoEnglish) additionalLanguages.push("en");
              try {
                await updateMutation.mutateAsync({
                  id: agentId,
                  primaryLanguage,
                  additionalLanguages,
                });
              } catch (saveError) {
                setError(
                  saveError instanceof Error ? saveError.message : "Could not save languages",
                );
              }
            }}
          >
            {updateMutation.isPending ? "Saving..." : "Save languages"}
          </Button>
          {saved ? <span className="text-sm text-emerald-600">Saved.</span> : null}
          {error ? <span className="text-sm text-destructive">{error}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
