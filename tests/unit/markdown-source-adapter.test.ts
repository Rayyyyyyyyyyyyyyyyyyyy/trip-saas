import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import type {
  MarkdownStructuralEvidence,
  SourceEvidenceUnit,
} from "../../src/domain/source/types";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { extractMarkdownSource } from "../../src/features/import/markdownSourceAdapter";
import type { TextSourceInput } from "../../src/domain/trip/types";

// The adapter now emits source-neutral evidence units. These helpers read the
// Markdown structural evidence so the compatibility assertions below still
// speak in block terms.
function evidenceOf(unit: SourceEvidenceUnit): MarkdownStructuralEvidence {
  const evidence = unit.structural_evidence.find(
    (item): item is MarkdownStructuralEvidence =>
      item.evidence_kind === "markdown_block",
  );
  if (!evidence) throw new Error(`No Markdown evidence on ${unit.id}`);
  return evidence;
}

const blockTypeOf = (unit: SourceEvidenceUnit) => evidenceOf(unit).block_type;

function fixture(name: string) {
  return readFileSync(
    fileURLToPath(
      new URL(`../fixtures/markdown-source/${name}`, import.meta.url),
    ),
    "utf8",
  );
}

function input(
  content: string,
  mode: TextSourceInput["input_mode"] = "markdown_file",
): TextSourceInput {
  return {
    schema_version: "text-source-input.v1",
    source_id: "source:adapter-fixture",
    input_mode: mode,
    media_type: "text/markdown",
    content,
    display_name:
      mode === "markdown_file" ? "fixture.md" : "Pasted Markdown itinerary",
  };
}

describe("Markdown source adapter", () => {
  it("preserves ordered headings, lists, GFM table evidence, links, and mixed text", () => {
    const document = extractMarkdownSource(
      input(fixture("mixed-structure.md")),
    );

    expect(document.evidence_units.map(blockTypeOf)).toEqual([
      "heading",
      "heading",
      "list_item",
      "list_item",
      "paragraph",
      "table",
      "paragraph",
      "blockquote",
      "paragraph",
    ]);
    expect(document.evidence_units.map((unit) => unit.source_order)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(document.evidence_units[0]?.locator).toBe(
      "file:fixture.md:lines:1-1",
    );

    const sequence = document.evidence_units.find((unit) =>
      unit.raw_value.includes("宇治站 > 平等院"),
    );
    expect(sequence && evidenceOf(sequence)).toMatchObject({
      block_type: "paragraph",
      sequence_like: true,
    });

    const table = document.evidence_units.find(
      (unit) => blockTypeOf(unit) === "table",
    );
    expect(table && evidenceOf(table)).toMatchObject({
      table_column_count: 3,
      table_row_count: 3,
    });
    expect(table?.raw_value).toContain("5.30");
    expect(table?.raw_value).toContain("12點");
    expect(table?.links).toEqual([
      { kind: "link", label: "地圖", target: "https://maps.example/uji" },
    ]);

    expect(
      document.evidence_units.some((unit) => unit.raw_value.includes("七點")),
    ).toBe(true);
    expect(
      document.evidence_units.some((unit) =>
        unit.raw_value.includes("Free Time"),
      ),
    ).toBe(true);
    expect(document.evidence_units[1]?.parent_ref).toBe(
      document.evidence_units[0]?.id,
    );
    expect(document.extraction_findings).toEqual([]);
  });

  it("creates stable pasted locators and deterministic source references", () => {
    const source = input("# Day 1\n\nAddress first place", "pasted_markdown");
    const first = extractMarkdownSource(source);
    const second = extractMarkdownSource(source);

    expect(first).toEqual(second);
    expect(first.evidence_units[0]?.id).toBe(
      "source:adapter-fixture:block:0001",
    );
    expect(first.evidence_units[0]?.locator).toBe("paste:lines:1-1");
    expect(first.evidence_units[1]?.locator).toBe("paste:lines:3-3");
  });

  it("records missing relative assets without failing the remaining document", () => {
    const document = extractMarkdownSource(input(fixture("broken-assets.md")));

    expect(document.extraction_findings).toEqual([
      expect.objectContaining({
        code: "MISSING_RELATIVE_ASSET",
        severity: "warning",
        target: "./assets/ticket.png",
      }),
    ]);
    expect(
      document.evidence_units.some((unit) =>
        unit.display_value.includes("地址"),
      ),
    ).toBe(true);
    expect(
      document.evidence_units
        .flatMap((unit) => unit.links)
        .find((link) => link.target.startsWith("https://")),
    ).toMatchObject({ kind: "image", target: "https://example.com/map.png" });
  });

  it("preserves nested and multiline list hierarchy from mdast positions", () => {
    const document = extractMarkdownSource(
      input(
        [
          "# Day 1",
          "",
          "- Outer item",
          "  continued detail",
          "  - Inner item",
          "    inner continuation",
          "- Second item",
        ].join("\n"),
      ),
    );
    const [heading, outer, inner, second] = document.evidence_units;

    expect(document.evidence_units.map(blockTypeOf)).toEqual([
      "heading",
      "list_item",
      "list_item",
      "list_item",
    ]);
    expect(outer?.parent_ref).toBe(heading?.id);
    expect(inner?.parent_ref).toBe(outer?.id);
    expect(second?.parent_ref).toBe(heading?.id);
    expect(outer?.raw_value).toContain("continued detail");
    expect(inner?.raw_value).toContain("inner continuation");
    expect(inner?.locator).toBe("file:fixture.md:lines:5-6");
    expect(evidenceOf(inner!).depth).toBeGreaterThan(
      outer ? evidenceOf(outer).depth : 0,
    );
  });

  it("emits documents that satisfy the source-document gate", () => {
    for (const name of ["mixed-structure.md", "broken-assets.md"]) {
      const source = input(fixture(name));
      const result = validateUnifiedSourceDocument(
        extractMarkdownSource(source),
        { source_id: source.source_id },
      );

      expect(result.valid).toBe(true);
    }
  });
});
