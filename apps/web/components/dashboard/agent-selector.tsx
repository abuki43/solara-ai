"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/providers";

const STORAGE_KEY = "solar-ai-selected-agent";

export function AgentSelector() {
  const { data: agents, isLoading } = trpc.agent.list.useQuery();
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedId(stored);
    }
  }, []);

  useEffect(() => {
    if (!agents?.length) {
      setSelectedId("");
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const stillExists = agents.some((agent) => agent.id === selectedId);
    if (!selectedId || !stillExists) {
      const firstId = agents[0]!.id;
      setSelectedId(firstId);
      localStorage.setItem(STORAGE_KEY, firstId);
    }
  }, [agents, selectedId]);

  function handleChange(value: string) {
    setSelectedId(value);
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent("agent-selected", { detail: value }));
  }

  if (isLoading) {
    return <Skeleton className="h-9 w-40" />;
  }

  if (!agents?.length) {
    return <span className="text-xs text-muted-foreground">No agents yet</span>;
  }

  return (
    <Select value={selectedId} onValueChange={handleChange}>
      <SelectTrigger className="h-9 w-[180px]">
        <SelectValue placeholder="Select agent" />
      </SelectTrigger>
      <SelectContent>
        {agents.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function useSelectedAgentId() {
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    setSelectedId(localStorage.getItem(STORAGE_KEY) ?? "");

    function handleChange(event: Event) {
      const custom = event as CustomEvent<string>;
      setSelectedId(custom.detail);
    }

    window.addEventListener("agent-selected", handleChange as EventListener);
    return () => window.removeEventListener("agent-selected", handleChange as EventListener);
  }, []);

  return selectedId;
}
