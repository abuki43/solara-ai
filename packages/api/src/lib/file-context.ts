export const FILE_CONTEXT_CHAR_BUDGET = 6000;

export type FileContextSource = {
  id: string;
  createdAt: Date;
  extractedText: string | null;
  parseStatus: "pending" | "parsed" | "failed";
};

/**
 * Build prompt file context with a 6000-character budget.
 * Oldest successfully parsed files are included first; newer content is truncated/dropped.
 */
export function buildFileContext(
  files: FileContextSource[],
  maxChars = FILE_CONTEXT_CHAR_BUDGET,
): string[] {
  const parsed = files
    .filter((file) => file.parseStatus === "parsed" && file.extractedText?.trim())
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const chunks: string[] = [];
  let remaining = maxChars;

  for (const file of parsed) {
    if (remaining <= 0) break;
    const text = file.extractedText!.trim();
    if (text.length <= remaining) {
      chunks.push(text);
      remaining -= text.length;
      continue;
    }
    chunks.push(text.slice(0, remaining));
    remaining = 0;
  }

  return chunks;
}
