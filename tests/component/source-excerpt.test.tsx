import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  createReviewEvidenceProjection,
  REVIEW_EXCERPT_MAX_CHARS,
} from "../../src/domain/source/reviewEvidence";
import { extractMarkdownSource } from "../../src/features/import/markdownSourceAdapter";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import { SourceExcerpt } from "../../src/features/review/SourceExcerpt";
import {
  validMarkdownSourceDocument,
  validTabularSourceDocument,
} from "../fixtures/contracts/sourceDocuments";

function projectionFor(value: UnifiedSourceDocument) {
  const result = validateUnifiedSourceDocument(value, {
    source_id: value.source_id,
  });
  if (!result.valid) throw new Error("fixture must satisfy the source gate");
  return createReviewEvidenceProjection(result.document);
}

describe("Review source evidence", () => {
  it("keeps the final booking row of a long Markdown table available in bounded excerpts", () => {
    const table =
      "| 時間 | 行程 |\n| --- | --- |\n" +
      "| 彈性 | 自由散步，不需預約 |\n".repeat(240) +
      "| 16:00 | 最晚抵達餐廳，16:30 訂位 ABC123 |";
    const document = extractMarkdownSource({
      schema_version: "text-source-input.v1",
      media_type: "text/markdown",
      source_id: "source:long-table",
      display_name: "Long table",
      input_mode: "pasted_markdown",
      content: table,
    });
    const items = projectionFor(document).itemsFor([
      document.evidence_units[0].id,
    ]);
    const excerpts = items.filter((item) => item.kind === "text_excerpt");
    expect(excerpts.map((item) => item.text).join("")).toBe(table);
    expect(
      excerpts.every((item) => item.text.length <= REVIEW_EXCERPT_MAX_CHARS),
    ).toBe(true);
    render(<SourceExcerpt items={items} />);
    expect(screen.getByText(/最晚抵達餐廳，16:30 訂位 ABC123/)).toBeVisible();
  });

  it("shows a Markdown excerpt through the text template", () => {
    const evidence = projectionFor(validMarkdownSourceDocument);
    render(
      <SourceExcerpt
        items={evidence.itemsFor(["source:fixture-001:unit:0002"])}
      />,
    );

    expect(screen.getByText(/原文 · paste:lines:3-3/)).toBeVisible();
    expect(screen.getByText(/11:55 \[Kansai Airport\]/)).toBeVisible();
    expect(screen.getByText("# Day 1")).toBeVisible();
  });

  it("does not repeat context already included in the selected references", () => {
    const evidence = projectionFor(validMarkdownSourceDocument);
    const items = evidence.itemsFor([
      "source:fixture-001:unit:0001",
      "source:fixture-001:unit:0002",
      "source:fixture-001:unit:0003",
    ]);
    expect(
      items.filter(
        (item) => item.kind === "text_excerpt" && item.text === "# Day 1",
      ),
    ).toHaveLength(1);
  });

  it("names an image asset alongside the text it came from", () => {
    const evidence = projectionFor(validMarkdownSourceDocument);
    render(
      <SourceExcerpt
        items={evidence.itemsFor(["source:fixture-001:unit:0003"])}
      />,
    );

    expect(screen.getByText(/附件 · paste:lines:5-5/)).toBeVisible();
    expect(screen.getByText(/Hotel map · \.\/hotel\.png/)).toBeVisible();
  });

  it("states plainly when a reference no longer resolves", () => {
    const evidence = projectionFor(validMarkdownSourceDocument);
    render(<SourceExcerpt items={evidence.itemsFor(["source:gone:0001"])} />);

    expect(screen.getByText("找不到來源片段")).toBeVisible();
  });

  it("distinguishes a user-added entity from a broken reference", () => {
    const evidence = projectionFor(validMarkdownSourceDocument);
    render(<SourceExcerpt items={evidence.itemsFor([])} />);

    expect(screen.getByText("你新增的內容")).toBeVisible();
    expect(screen.queryByText("找不到來源片段")).toBeNull();
  });

  it("presents tabular evidence by sheet and locator without workbook objects", () => {
    const evidence = projectionFor(validTabularSourceDocument);
    const items = evidence.itemsFor(["source:fixture-002:unit:0002"]);
    render(<SourceExcerpt items={items} />);

    expect(screen.getByText(/原文 · Day1 · sheet:Day1!A2:B2/)).toBeVisible();
    expect(screen.getByText("18:30~")).toBeVisible();
    expect(screen.getByText("時間")).toBeVisible();
    // The projection is the whole contract: no merge, formula, or hyperlink
    // structure reaches the component.
    expect(items).toEqual([
      {
        kind: "tabular_excerpt",
        source_ref: "source:fixture-002:unit:0001",
        locator_label: "sheet:Day1!A1",
        sheet_name: "Day1",
        text: "時間",
        truncated: false,
      },
      {
        kind: "tabular_excerpt",
        source_ref: "source:fixture-002:unit:0002",
        locator_label: "sheet:Day1!A2:B2",
        sheet_name: "Day1",
        text: "18:30~",
        truncated: false,
      },
    ]);
  });
});
