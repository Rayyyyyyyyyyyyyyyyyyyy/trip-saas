import { describe, expect, it } from "vitest";

import { validateTextSourceInputSchema } from "../../src/domain/trip/schemaValidators";
import {
  MAX_MARKDOWN_BYTES,
  normalizeMarkdownFile,
  normalizePastedMarkdown,
  SourceInputError,
} from "../../src/features/import/textSourceInput";

const sourceId = () => "source:test-session-001";

describe("TextSourceInput normalization", () => {
  it("normalizes pasted Markdown into the shared schema", () => {
    const input = normalizePastedMarkdown("# Osaka\n\nFree Time", {
      createSourceId: sourceId,
    });

    expect(input).toEqual({
      schema_version: "text-source-input.v1",
      source_id: "source:test-session-001",
      input_mode: "pasted_markdown",
      media_type: "text/markdown",
      content: "# Osaka\n\nFree Time",
      display_name: "Pasted Markdown itinerary",
    });
    expect(validateTextSourceInputSchema(input).valid).toBe(true);
  });

  it("normalizes a readable Markdown file into the same schema", async () => {
    const input = await normalizeMarkdownFile(
      {
        name: "trip.MD",
        size: 15,
        type: "text/markdown",
        text: async () => "# Osaka\n\nDay 1",
      },
      { createSourceId: sourceId },
    );

    expect(input.input_mode).toBe("markdown_file");
    expect(input.display_name).toBe("trip.MD");
    expect(input.media_type).toBe("text/markdown");
    expect(validateTextSourceInputSchema(input).valid).toBe(true);
  });

  it.each([
    [
      "empty",
      () => normalizePastedMarkdown("  \n ", { createSourceId: sourceId }),
    ],
    [
      "too_large",
      () =>
        normalizePastedMarkdown("旅".repeat(MAX_MARKDOWN_BYTES), {
          createSourceId: sourceId,
        }),
    ],
  ])("rejects %s pasted content before interpretation", (code, action) => {
    expect(action).toThrowError(SourceInputError);
    try {
      action();
    } catch (error) {
      expect(error).toMatchObject({ code });
    }
  });

  // The source schema declares a dormant tabular evidence variant. Declaring
  // it must not make spreadsheet files selectable or readable.
  it("keeps spreadsheet sources rejected while the tabular variant stays dormant", async () => {
    const spreadsheets = [
      {
        name: "Busan.xlsx",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      { name: "Busan.xls", type: "application/vnd.ms-excel" },
      { name: "Busan.csv", type: "text/csv" },
    ];

    for (const spreadsheet of spreadsheets) {
      await expect(
        normalizeMarkdownFile({
          ...spreadsheet,
          size: 10,
          text: async () => "time,place\n18:30~,Jagalchi",
        }),
      ).rejects.toMatchObject({ code: "unsupported_type" });
    }
  });

  it("rejects unsupported, oversized, and unreadable files", async () => {
    await expect(
      normalizeMarkdownFile({
        name: "trip.pdf",
        size: 10,
        type: "application/pdf",
        text: async () => "content",
      }),
    ).rejects.toMatchObject({ code: "unsupported_type" });

    await expect(
      normalizeMarkdownFile({
        name: "trip.md",
        size: MAX_MARKDOWN_BYTES + 1,
        type: "text/markdown",
        text: async () => "content",
      }),
    ).rejects.toMatchObject({ code: "too_large" });

    await expect(
      normalizeMarkdownFile({
        name: "trip.md",
        size: 10,
        type: "text/markdown",
        text: async () => {
          throw new Error("read failed");
        },
      }),
    ).rejects.toMatchObject({ code: "unreadable" });
  });
});
