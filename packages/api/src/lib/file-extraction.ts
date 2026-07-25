export const MAX_FILE_BYTES = 2_097_152;
export const MAX_FILES_PER_AGENT = 5;
export const ALLOWED_EXTENSIONS = [".txt", ".md", ".pdf"] as const;
export const ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "application/pdf",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function extensionForFilename(filename: string): string {
  const index = filename.lastIndexOf(".");
  if (index < 0) return "";
  return filename.slice(index).toLowerCase();
}

export function isAllowedUpload(filename: string, mimeType: string): boolean {
  const extension = extensionForFilename(filename);
  if (!ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])) {
    return false;
  }
  if (extension === ".pdf") return mimeType === "application/pdf";
  if (extension === ".md") {
    return mimeType === "text/markdown" || mimeType === "text/plain";
  }
  return mimeType === "text/plain";
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<{ text: string; parseStatus: "parsed" | "failed"; parseError: string | null }> {
  try {
    const extension = extensionForFilename(filename);
    if (extension === ".pdf" || mimeType === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        const text = (result.text ?? "").trim();
        if (!text) {
          return {
            text: "",
            parseStatus: "failed",
            parseError: "No extractable text found in PDF",
          };
        }
        return { text, parseStatus: "parsed", parseError: null };
      } finally {
        await parser.destroy().catch(() => undefined);
      }
    }

    const text = buffer.toString("utf8").trim();
    if (!text) {
      return {
        text: "",
        parseStatus: "failed",
        parseError: "File is empty",
      };
    }
    return { text, parseStatus: "parsed", parseError: null };
  } catch (error) {
    return {
      text: "",
      parseStatus: "failed",
      parseError: error instanceof Error ? error.message : "Failed to extract text",
    };
  }
}
