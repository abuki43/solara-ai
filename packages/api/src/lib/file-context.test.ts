import { describe, expect, it } from "vitest";

import { FILE_CONTEXT_CHAR_BUDGET, buildFileContext } from "./file-context";

describe("buildFileContext", () => {
  it("includes oldest parsed files first and truncates to budget", () => {
    const files = [
      {
        id: "2",
        createdAt: new Date("2026-07-02T00:00:00Z"),
        extractedText: "B".repeat(4000),
        parseStatus: "parsed" as const,
      },
      {
        id: "1",
        createdAt: new Date("2026-07-01T00:00:00Z"),
        extractedText: "A".repeat(3000),
        parseStatus: "parsed" as const,
      },
      {
        id: "3",
        createdAt: new Date("2026-07-03T00:00:00Z"),
        extractedText: "failed",
        parseStatus: "failed" as const,
      },
    ];

    const chunks = buildFileContext(files, FILE_CONTEXT_CHAR_BUDGET);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toBe("A".repeat(3000));
    expect(chunks[1]).toBe("B".repeat(3000));
    expect(chunks.join("").length).toBe(FILE_CONTEXT_CHAR_BUDGET);
  });

  it("skips empty and pending files", () => {
    expect(
      buildFileContext([
        {
          id: "1",
          createdAt: new Date(),
          extractedText: "   ",
          parseStatus: "parsed",
        },
        {
          id: "2",
          createdAt: new Date(),
          extractedText: "hello",
          parseStatus: "pending",
        },
      ]),
    ).toEqual([]);
  });
});
