"use client";

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
import { trpc } from "@/lib/providers";

export function SettingsPageContent() {
  const utils = trpc.useUtils();
  const { data: organization, isLoading } = trpc.organization.get.useQuery();
  const updateMutation = trpc.organization.update.useMutation({
    onSuccess: () => utils.organization.get.invalidate(),
  });

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("Africa/Addis_Ababa");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (organization) {
      setName(organization.name);
      setPhone(organization.phone ?? "");
      setWebsite(organization.website ?? "");
      setAddress(organization.address ?? "");
      setTimezone(organization.timezone);
    }
  }, [organization]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    await updateMutation.mutateAsync({
      name,
      phone: phone || null,
      website: website || null,
      address: address || null,
      timezone,
    });
    setSaved(true);
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full max-w-2xl rounded-xl" />;
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Business profile</CardTitle>
        <CardDescription>Update your organization details used by all agents.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address / area</Label>
            <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Addis_Ababa">Africa/Addis_Ababa</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
            {saved ? <span className="text-sm text-emerald-600">Settings saved.</span> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
