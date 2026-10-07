import { describe, expect, it } from "vitest";
import { createSpreadsheetSourceIdentity } from "../../src/features/import/spreadsheetSourceIdentity";

const bytes = new TextEncoder().encode("synthetic workbook bytes").buffer;

describe("selected-sheet source identity", () => {
  it("normalizes selection order and preserves the caller's selection", async () => {
    const selection = [7, 2, 0];
    const unordered = await createSpreadsheetSourceIdentity(bytes, selection);
    const ordered = await createSpreadsheetSourceIdentity(bytes, [0, 2, 7]);
    expect(unordered).toEqual(ordered);
    expect(selection).toEqual([7, 2, 0]);
    expect(unordered.sourceId).toMatch(/^source:tabular:[a-f0-9]{64}$/);
  });
  it("changes identity when selected scope or file content changes", async () => {
    const all = await createSpreadsheetSourceIdentity(bytes, [0, 2]);
    const subset = await createSpreadsheetSourceIdentity(bytes, [0]);
    const different = await createSpreadsheetSourceIdentity(
      new TextEncoder().encode("different bytes").buffer,
      [0, 2],
    );
    expect(subset.sourceId).not.toBe(all.sourceId);
    expect(different.sourceId).not.toBe(all.sourceId);
    expect(subset.contentHash).toBe(all.contentHash);
    expect(different.contentHash).not.toBe(all.contentHash);
  });
  it.each([
    { selection: [] },
    { selection: [0, 0] },
    { selection: [-1] },
    { selection: [NaN] },
    { selection: [0.5] },
    { selection: Array.from({ length: 20 }, (_, index) => index) },
  ])("rejects invalid selection $selection", async ({ selection }) => {
    await expect(
      createSpreadsheetSourceIdentity(bytes, selection),
    ).rejects.toMatchObject({ code: "invalid_contract" });
  });
});
