import { unlink } from "node:fs/promises";

import { db } from "@solar-ai/db";
import { agentFiles } from "@solar-ai/db/schema/agent-file";
import { TRPCError } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { loadOwnedAgent } from "../lib/load-owned-agent";
import { orgOwnerProcedure } from "../lib/org-procedure";
import { router } from "../index";

export const filesRouter = router({
  list: orgOwnerProcedure
    .input(z.object({ agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await loadOwnedAgent(ctx.organization.id, input.agentId);
      return db
        .select({
          id: agentFiles.id,
          agentId: agentFiles.agentId,
          filename: agentFiles.filename,
          mimeType: agentFiles.mimeType,
          sizeBytes: agentFiles.sizeBytes,
          parseStatus: agentFiles.parseStatus,
          parseError: agentFiles.parseError,
          createdAt: agentFiles.createdAt,
        })
        .from(agentFiles)
        .where(eq(agentFiles.agentId, input.agentId))
        .orderBy(asc(agentFiles.createdAt));
    }),

  getExtractedText: orgOwnerProcedure
    .input(z.object({ fileId: z.string().min(1), agentId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await loadOwnedAgent(ctx.organization.id, input.agentId);
      const [file] = await db
        .select({
          id: agentFiles.id,
          filename: agentFiles.filename,
          parseStatus: agentFiles.parseStatus,
          parseError: agentFiles.parseError,
          extractedText: agentFiles.extractedText,
        })
        .from(agentFiles)
        .where(and(eq(agentFiles.id, input.fileId), eq(agentFiles.agentId, input.agentId)))
        .limit(1);

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
      }
      return file;
    }),

  delete: orgOwnerProcedure
    .input(z.object({ fileId: z.string().min(1), agentId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await loadOwnedAgent(ctx.organization.id, input.agentId);
      const [file] = await db
        .select()
        .from(agentFiles)
        .where(and(eq(agentFiles.id, input.fileId), eq(agentFiles.agentId, input.agentId)))
        .limit(1);

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
      }

      await db.delete(agentFiles).where(eq(agentFiles.id, file.id));
      try {
        await unlink(file.storagePath);
      } catch {
        // File may already be missing from disk; DB row is the source of truth.
      }
      return { success: true };
    }),
});
