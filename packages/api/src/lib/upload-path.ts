import { mkdir } from "node:fs/promises";
import path from "node:path";

export function resolveUploadRoot(uploadDir?: string): string {
  return path.resolve(uploadDir || path.join(process.cwd(), "uploads"));
}

export async function ensureAgentUploadDir(options: {
  uploadDir?: string;
  organizationId: string;
  agentId: string;
}): Promise<string> {
  const root = resolveUploadRoot(options.uploadDir);
  const dir = path.join(root, options.organizationId, options.agentId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function buildStoragePath(options: {
  uploadDir?: string;
  organizationId: string;
  agentId: string;
  fileId: string;
  extension: string;
}): string {
  const root = resolveUploadRoot(options.uploadDir);
  return path.join(
    root,
    options.organizationId,
    options.agentId,
    `${options.fileId}${options.extension}`,
  );
}
