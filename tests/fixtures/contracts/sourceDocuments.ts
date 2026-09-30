// Contract fixtures for the source-neutral `UnifiedSourceDocument`.
//
// The Markdown fixture is the shape the current Markdown Source Adapter must
// produce after task 2.1. The tabular fixture exercises the dormant variant
// that Spreadsheet V0.2 will later consume; declaring it here proves the
// schema seam exists without enabling XLSX/XLS/CSV intake.

import type { UnifiedSourceDocument } from "../../../src/domain/source/types";

export const validMarkdownSourceDocument: UnifiedSourceDocument = {
  schema_version: "unified-source-document.v1",
  source_id: "source:fixture-001",
  display_name: "Pasted itinerary",
  input_mode: "pasted_markdown",
  source_format: "markdown",
  evidence_units: [
    {
      id: "source:fixture-001:unit:0001",
      source_order: 0,
      parent_ref: null,
      locator: "paste:lines:1-1",
      raw_value: "# Day 1",
      display_value: "Day 1",
      links: [],
      structural_evidence: [
        {
          evidence_kind: "markdown_block",
          block_type: "heading",
          depth: 0,
          line_start: 1,
          line_end: 1,
          heading_level: 1,
        },
      ],
    },
    {
      id: "source:fixture-001:unit:0002",
      source_order: 1,
      parent_ref: "source:fixture-001:unit:0001",
      locator: "paste:lines:3-3",
      raw_value: "- 11:55 [Kansai Airport](https://maps.example/kix) > Namba",
      display_value: "11:55 Kansai Airport > Namba",
      links: [
        {
          kind: "link",
          label: "Kansai Airport",
          target: "https://maps.example/kix",
        },
      ],
      structural_evidence: [
        {
          evidence_kind: "markdown_block",
          block_type: "list_item",
          depth: 1,
          line_start: 3,
          line_end: 3,
          list_marker: "-",
          sequence_like: true,
        },
      ],
    },
    {
      id: "source:fixture-001:unit:0003",
      source_order: 2,
      parent_ref: "source:fixture-001:unit:0001",
      locator: "paste:lines:5-5",
      raw_value: "![Hotel map](./hotel.png)",
      display_value: "Hotel map",
      links: [{ kind: "image", label: "Hotel map", target: "./hotel.png" }],
      structural_evidence: [
        {
          evidence_kind: "markdown_block",
          block_type: "paragraph",
          depth: 1,
          line_start: 5,
          line_end: 5,
        },
      ],
    },
  ],
  extraction_findings: [
    {
      code: "MISSING_RELATIVE_ASSET",
      severity: "warning",
      message:
        "單一 Markdown 檔無法開啟相對圖片 ./hotel.png，但圖片參照已保留。",
      evidence_unit_ref: "source:fixture-001:unit:0003",
      locator: "paste:lines:5-5",
      target: "./hotel.png",
    },
  ],
};

export const validTabularSourceDocument: UnifiedSourceDocument = {
  schema_version: "unified-source-document.v1",
  source_id: "source:fixture-002",
  display_name: "Busan.xlsx",
  input_mode: "markdown_file",
  source_format: "tabular",
  evidence_units: [
    {
      id: "source:fixture-002:unit:0001",
      source_order: 0,
      parent_ref: null,
      locator: "sheet:Day1!A1",
      raw_value: "時間",
      display_value: "時間",
      links: [],
      structural_evidence: [
        {
          evidence_kind: "tabular_region",
          sheet_id: "sheet:Day1",
          sheet_name: "Day1",
          sheet_order: 0,
          row_start: 1,
          row_end: 1,
          column_start: 1,
          column_end: 1,
          header_ref: null,
          merge_ref: null,
        },
      ],
    },
    {
      id: "source:fixture-002:unit:0002",
      source_order: 1,
      parent_ref: null,
      locator: "sheet:Day1!A2:B2",
      raw_value: "18:30~",
      display_value: "18:30~",
      links: [],
      structural_evidence: [
        {
          evidence_kind: "tabular_region",
          sheet_id: "sheet:Day1",
          sheet_name: "Day1",
          sheet_order: 0,
          row_start: 2,
          row_end: 2,
          column_start: 1,
          column_end: 2,
          header_ref: "source:fixture-002:unit:0001",
          merge_ref: "sheet:Day1!A2:B2",
          cached_display_value: "18:30~",
          hyperlink_target: "https://maps.example/jagalchi",
        },
      ],
    },
  ],
  extraction_findings: [],
};
