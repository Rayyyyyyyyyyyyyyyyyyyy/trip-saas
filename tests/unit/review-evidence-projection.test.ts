import { describe, expect, it } from "vitest";
import {
  createReviewEvidenceProjection,
  REVIEW_EXCERPT_MAX_CHARS,
} from "../../src/domain/source/reviewEvidence";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import {
  validMarkdownSourceDocument,
  validTabularSourceDocument,
} from "../fixtures/contracts/sourceDocuments";

function project(document: UnifiedSourceDocument) {
  const gate = validateUnifiedSourceDocument(document, {
    source_id: document.source_id,
  });
  if (!gate.valid) throw new Error(JSON.stringify(gate.failures));
  return createReviewEvidenceProjection(gate.document);
}
describe("bounded Review evidence projection", () => {
  it("projects relative coordinates without formula, typed value or workbook objects", () => {
    const source = structuredClone(validTabularSourceDocument);
    source.evidence_units[1].structural_evidence[0] = {
      ...source.evidence_units[1].structural_evidence[0],
      formula: "PRIVATE_FORMULA",
      typed_hint: { kind: "date_serial", value: 45900, date_system: "1900" },
    } as (typeof source.evidence_units)[1]["structural_evidence"][number];
    const items = project(source).itemsFor([source.evidence_units[1].id]);
    expect(items[1]).toMatchObject({
      kind: "tabular_excerpt",
      sheet_id: "sheet:Day1",
      row_start: 2,
      row_end: 2,
      column_start: 1,
      column_end: 2,
    });
    expect(JSON.stringify(items)).not.toContain("PRIVATE_FORMULA");
    expect(JSON.stringify(items)).not.toContain("45900");
    expect(JSON.stringify(items)).not.toContain("typed_hint");
  });
  it("preserves empty displayed cells without exposing raw serials or formulas", () => {
    const source = structuredClone(validTabularSourceDocument);
    source.evidence_units[1].raw_value = "PRIVATE_RAW_SERIAL";
    source.evidence_units[1].display_value = "";
    const excerpts = project(source).itemsFor([source.evidence_units[1].id]);
    expect(excerpts[1]).toMatchObject({ kind: "tabular_excerpt", text: "" });
    expect(JSON.stringify(excerpts)).not.toContain("PRIVATE_RAW_SERIAL");
  });
  it("continues long cells in bounded fragments without losing final instructions", () => {
    const source = structuredClone(validTabularSourceDocument);
    const text = "行程參考".repeat(2500) + "最後一行最晚16:00抵達";
    source.evidence_units[1].display_value = text;
    const items = project(source)
      .itemsFor([source.evidence_units[1].id])
      .filter((item) => item.kind === "tabular_excerpt")
      .filter((item) => item.source_ref === source.evidence_units[1].id);
    expect(items.map((item) => item.text).join("")).toBe(text);
    expect(
      items.every(
        (item) =>
          item.text.length <= REVIEW_EXCERPT_MAX_CHARS &&
          item.fragment_count === items.length &&
          !item.truncated,
      ),
    ).toBe(true);
    expect(items.map((item) => item.fragment_index)).toEqual(
      items.map((_item, index) => index),
    );
  });
  it("reports selected scope and excluded names without an invented embedded image inventory", () => {
    const source = structuredClone(validTabularSourceDocument);
    source.excluded_sheets = ["金額", "行李清單"];
    const projection = project(source);
    expect(projection.coverage_scope).toEqual({
      kind: "selected_sheets",
      excluded_sheet_names: ["金額", "行李清單"],
    });
    expect(projection.image_summary).toEqual({
      unimported_references: [],
      workbook_inventory_unavailable: true,
    });
    source.input_mode = "csv_file";
    expect(project(source).image_summary.workbook_inventory_unavailable).toBe(
      false,
    );
  });
  it("summarizes only recorded unimported references once and retains Markdown source text", () => {
    const source = structuredClone(validMarkdownSourceDocument);
    source.extraction_findings.push(
      structuredClone(source.extraction_findings[0]),
    );
    const projection = project(source);
    expect(projection.image_summary.unimported_references).toEqual([
      {
        source_ref: source.evidence_units[2].id,
        locator_label: source.evidence_units[2].locator,
        label: "Hotel map",
        target: "./hotel.png",
      },
    ]);
    const items = projection.itemsFor([source.evidence_units[2].id]);
    expect(items.some((item) => item.kind === "asset_reference")).toBe(false);
    expect(items).toContainEqual(
      expect.objectContaining({
        kind: "text_excerpt",
        text: "![Hotel map](./hotel.png)",
      }),
    );
  });
});
