"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/providers";

export function WidgetSettingsCard({ agentId }: { agentId: string }) {
  const utils = trpc.useUtils();
  const { data: agent, isLoading } = trpc.agent.get.useQuery({ id: agentId });
  const [buttonLabel, setButtonLabel] = useState("Start Call");
  const [accentColor, setAccentColor] = useState("#7cf0ff");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = trpc.agent.update.useMutation({
    async onSuccess() {
      await utils.agent.get.invalidate({ id: agentId });
      await utils.agent.list.invalidate();
      setSaved(true);
    },
  });

  useEffect(() => {
    if (!agent) return;
    setButtonLabel(agent.widgetButtonLabel || "Start Call");
    setAccentColor(agent.widgetAccentColor || "#7cf0ff");
  }, [agent]);

  if (isLoading) {
    return <Skeleton className="h-48 w-full max-w-3xl rounded-xl" />;
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Website embed widget</CardTitle>
        <CardDescription>
          Customize the button shown on <code>/embed/{agent?.slug}</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <div className="space-y-2">
            <Label htmlFor="widget-label">Button label</Label>
            <Input
              id="widget-label"
              value={buttonLabel}
              maxLength={40}
              onChange={(event) => {
                setSaved(false);
                setButtonLabel(event.target.value);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="widget-color">Accent color</Label>
            <Input
              id="widget-color"
              type="color"
              value={accentColor}
              onChange={(event) => {
                setSaved(false);
                setAccentColor(event.target.value);
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            disabled={updateMutation.isPending || !buttonLabel.trim()}
            onClick={async () => {
              setError(null);
              setSaved(false);
              try {
                await updateMutation.mutateAsync({
                  id: agentId,
                  widgetButtonLabel: buttonLabel.trim(),
                  widgetAccentColor: accentColor,
                });
              } catch (saveError) {
                setError(
                  saveError instanceof Error ? saveError.message : "Could not save widget settings",
                );
              }
            }}
          >
            {updateMutation.isPending ? "Saving..." : "Save widget"}
          </Button>
          {saved ? <span className="text-sm text-emerald-600">Saved.</span> : null}
          {error ? <span className="text-sm text-destructive">{error}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
