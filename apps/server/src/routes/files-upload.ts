import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
  MAX_FILES_PER_AGENT,
  extractTextFromBuffer,
  extensionForFilename,
  isAllowedUpload,
} from "@solar-ai/api/lib/file-extraction";
import { buildStoragePath, ensureAgentUploadDir } from "@solar-ai/api/lib/upload-path";
import { auth } from "@solar-ai/auth";
import { db } from "@solar-ai/db";
import { agents } from "@solar-ai/db/schema/agent";
import { agentFiles } from "@solar-ai/db/schema/agent-file";
import { organizations } from "@solar-ai/db/schema/organization";
import { env } from "@solar-ai/env/server";
import { fromNodeHeaders } from "better-auth/node";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import multer from "multer";
import { writeFile } from "node:fs/promises";
import { z } from "zod";

export const filesUploadRouter: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
});

const bodySchema = z.object({
  agentId: z.string().min(1),
});

filesUploadRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { agentId } = bodySchema.parse(req.body);
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Missing file upload" });
      return;
    }

    const [owned] = await db
      .select({ agent: agents, organization: organizations })
      .from(agents)
      .innerJoin(organizations, eq(agents.organizationId, organizations.id))
      .where(and(eq(agents.id, agentId), eq(organizations.userId, session.user.id)))
      .limit(1);

    if (!owned) {
      res.status(404).json({ error: "Receptionist not found" });
      return;
    }

    const existing = await db
      .select({ id: agentFiles.id })
      .from(agentFiles)
      .where(eq(agentFiles.agentId, agentId));

    if (existing.length >= MAX_FILES_PER_AGENT) {
      res.status(400).json({
        error: `Maximum ${MAX_FILES_PER_AGENT} files reached. Delete one to upload more.`,
      });
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      res.status(400).json({ error: "File too large. Maximum size is 2MB." });
      return;
    }

    if (!isAllowedUpload(file.originalname, file.mimetype)) {
      res.status(400).json({
        error: "Unsupported file type. Use .txt, .md, or .pdf.",
      });
      return;
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_MIME_TYPES)[number],
      ) &&
      !(extensionForFilename(file.originalname) === ".md" && file.mimetype === "text/plain")
    ) {
      res.status(400).json({
        error: "Unsupported file type. Use .txt, .md, or .pdf.",
      });
      return;
    }

    const fileId = crypto.randomUUID();
    const extension = extensionForFilename(file.originalname) || ".bin";
    await ensureAgentUploadDir({
      uploadDir: env.UPLOAD_DIR,
      organizationId: owned.organization.id,
      agentId,
    });
    const storagePath = buildStoragePath({
      uploadDir: env.UPLOAD_DIR,
      organizationId: owned.organization.id,
      agentId,
      fileId,
      extension,
    });

    await writeFile(storagePath, file.buffer);
    const extracted = await extractTextFromBuffer(
      file.buffer,
      file.mimetype,
      file.originalname,
    );

    const [created] = await db
      .insert(agentFiles)
      .values({
        id: fileId,
        agentId,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath,
        extractedText: extracted.text || null,
        parseStatus: extracted.parseStatus,
        parseError: extracted.parseError,
      })
      .returning({
        id: agentFiles.id,
        agentId: agentFiles.agentId,
        filename: agentFiles.filename,
        mimeType: agentFiles.mimeType,
        sizeBytes: agentFiles.sizeBytes,
        parseStatus: agentFiles.parseStatus,
        parseError: agentFiles.parseError,
        createdAt: agentFiles.createdAt,
      });

    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0]?.message ?? "Invalid upload request" });
      return;
    }
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "File too large. Maximum size is 2MB." });
        return;
      }
      res.status(400).json({ error: error.message });
      return;
    }
    console.error("File upload failed", error);
    res.status(500).json({ error: "File upload failed" });
  }
});
