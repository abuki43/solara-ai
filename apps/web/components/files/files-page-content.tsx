"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { useSelectedAgentId } from "@/components/dashboard/agent-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/providers";

const MAX_BYTES = 2_097_152;
const MAX_FILES = 5;
const ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf"];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extensionOf(filename: string) {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index).toLowerCase() : "";
}

export function FilesPageContent() {
  const agentId = useSelectedAgentId();
  const utils = trpc.useUtils();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  const filesQuery = trpc.files.list.useQuery({ agentId }, { enabled: Boolean(agentId) });
  const deleteMutation = trpc.files.delete.useMutation({
    async onSuccess() {
      await utils.files.list.invalidate({ agentId });
      await utils.knowledge.get.invalidate({ agentId });
    },
  });
  const previewQuery = trpc.files.getExtractedText.useQuery(
    { agentId, fileId: previewFileId ?? "" },
    { enabled: Boolean(agentId && previewFileId) },
  );

  if (!agentId) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Choose a receptionist</CardTitle>
          <CardDescription>Select a receptionist in the header before uploading files.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (filesQuery.isLoading) {
    return <Skeleton className="h-96 w-full max-w-3xl rounded-xl" />;
  }

  const files = filesQuery.data ?? [];

  async function uploadFile(file: File) {
    if (!agentId) return;
    setError(null);
    if (files.length >= MAX_FILES) {
      setError("Maximum 5 files reached. Delete one to upload more.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File too large. Maximum size is 2MB.");
      return;
    }
    if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name) as (typeof ALLOWED_EXTENSIONS)[number])) {
      setError("Unsupported file type. Use .txt, .md, or .pdf.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("agentId", agentId);
      body.append("file", file);
      const response = await fetch("/api/files/upload", {
        method: "POST",
        credentials: "include",
        body,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Upload failed");
      }
      await utils.files.list.invalidate({ agentId });
      await utils.knowledge.get.invalidate({ agentId });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Files for this receptionist</CardTitle>
          <CardDescription>
            Upload small documents about your business. Max 2MB per file, 5 files total.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center ${
              dragOver ? "border-primary bg-primary/5" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void uploadFile(file);
            }}
          >
            <Upload className="size-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Drag and drop a file here</p>
              <p className="text-sm text-muted-foreground">or click to browse (.txt, .md, .pdf)</p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={uploading || files.length >= MAX_FILES}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Uploading..." : "Choose file"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void uploadFile(file);
              }}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded files</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.sizeBytes)} · {new Date(file.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={file.parseStatus === "parsed" ? "default" : "secondary"}>
                    {file.parseStatus === "parsed"
                      ? "Parsed"
                      : file.parseStatus === "failed"
                        ? "Failed"
                        : "Pending"}
                  </Badge>
                  <Button type="button" variant="outline" size="sm" onClick={() => setPreviewFileId(file.id)}>
                    View text
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (!window.confirm(`Delete ${file.filename}?`)) return;
                      deleteMutation.mutate({ agentId, fileId: file.id });
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Sheet open={Boolean(previewFileId)} onOpenChange={(open) => !open && setPreviewFileId(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{previewQuery.data?.filename ?? "Extracted text"}</SheetTitle>
            <SheetDescription>
              {previewQuery.data?.parseStatus === "failed"
                ? previewQuery.data.parseError || "Parsing failed"
                : "Text injected into the receptionist prompt (subject to the 6000-character budget)."}
            </SheetDescription>
          </SheetHeader>
          <pre className="mt-6 max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-xs">
            {previewQuery.isLoading
              ? "Loading..."
              : previewQuery.data?.extractedText || "No extracted text."}
          </pre>
        </SheetContent>
      </Sheet>
    </div>
  );
}
