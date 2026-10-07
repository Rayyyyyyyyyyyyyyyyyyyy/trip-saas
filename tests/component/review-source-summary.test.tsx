import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReviewSourceSummary } from "../../src/features/review/ReviewSourceSummary";
import { ReviewScreen } from "../../src/features/review/ReviewScreen";
import { createReviewEvidenceProjection } from "../../src/domain/source/reviewEvidence";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import {
  validMarkdownSourceDocument,
  validTabularSourceDocument,
} from "../fixtures/contracts/sourceDocuments";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

function project(source: UnifiedSourceDocument) {
  const gate = validateUnifiedSourceDocument(source, {
    source_id: source.source_id,
  });
  if (!gate.valid) throw new Error(JSON.stringify(gate.failures));
  return createReviewEvidenceProjection(gate.document);
}
describe("Review selected-scope and image summary", () => {
  it("distinguishes complete accounting from understanding and explicitly lists exclusions and unparsed count", () => {
    const source = structuredClone(validTabularSourceDocument);
    source.excluded_sheets = ["金額", "行李清單"];
    render(
      <ReviewSourceSummary evidence={project(source)} unparsedCount={3} />,
    );
    expect(screen.getByText("已選分頁 100% 覆蓋")).toBeVisible();
    expect(screen.getByText(/不代表每筆內容都已理解/)).toBeVisible();
    expect(
      screen.getByText("未判讀 3 項 · 未選分頁：金額、行李清單"),
    ).toBeVisible();
    expect(screen.getByText(/若工作簿有內嵌圖片/)).toBeVisible();
    expect(screen.queryByText(/0 個圖片|0 張圖片/)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("expands one non-blocking image line by keyboard into individually located references", async () => {
    const source = structuredClone(validMarkdownSourceDocument);
    const unit = source.evidence_units[2];
    unit.links.push({
      kind: "image",
      label: "Ticket photo",
      target: "./image 1.png",
    });
    source.extraction_findings.push({
      ...source.extraction_findings[0],
      target: "./image 1.png",
    });
    const user = userEvent.setup();
    render(
      <ReviewSourceSummary evidence={project(source)} unparsedCount={0} />,
    );
    const disclosure = screen.getByRole("button", {
      name: "來源有 2 個圖片參照未匯入，查看明細",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Hotel map · ./hotel.png")).not.toBeVisible();
    disclosure.focus();
    await user.keyboard("{Enter}");
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    const details = document.getElementById(
      disclosure.getAttribute("aria-controls")!,
    )!;
    expect(within(details).getAllByRole("listitem")).toHaveLength(2);
    expect(within(details).getByText("Hotel map · ./hotel.png")).toBeVisible();
    expect(
      within(details).getByText("Ticket photo · ./image 1.png"),
    ).toBeVisible();
    expect(within(details).getAllByText("paste:lines:5-5")).toHaveLength(2);
  });
  it("keeps CSV scope truthful without implying an embedded workbook image inventory", () => {
    const source = structuredClone(validTabularSourceDocument);
    source.input_mode = "csv_file";
    render(
      <ReviewSourceSummary evidence={project(source)} unparsedCount={0} />,
    );
    expect(screen.getByText("未判讀 0 項 · 沒有未選分頁")).toBeVisible();
    expect(screen.queryByText(/內嵌圖片/)).toBeNull();
  });
  it("summarizes known missing images once without blocking confirmation or repeating provider warnings", () => {
    const interpretation = structuredClone(validDraftInterpretationResult);
    const source = structuredClone(validMarkdownSourceDocument);
    const ref = source.evidence_units[2].id;
    interpretation.draft!.trip.source_refs = [ref];
    interpretation.draft!.days[0].source_refs = [ref];
    interpretation.draft!.entities[0].source_refs = [ref];
    interpretation.findings = [
      {
        id: "finding:image",
        severity: "warning",
        code: "MISSING_ASSET",
        message: "Repeating missing-image warning",
        blocking: true,
        entity_refs: [],
        source_refs: [ref],
      },
    ];
    render(
      <ReviewScreen
        adjustments={[]}
        evidence={project(source)}
        draft={interpretation.draft!}
        interpretation={interpretation}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        onDraftChange={vi.fn()}
        originalDraft={interpretation.draft!}
      />,
    );
    expect(
      screen.getAllByRole("button", {
        name: "來源有 1 個圖片參照未匯入，查看明細",
      }),
    ).toHaveLength(1);
    expect(screen.queryByText("Repeating missing-image warning")).toBeNull();
    expect(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    ).toBeEnabled();
  });
});
