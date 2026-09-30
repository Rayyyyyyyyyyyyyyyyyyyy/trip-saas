import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  ParsedTripDraft,
  SemanticInterpretationResult,
} from "../../src/domain/trip/types";
import { ReviewScreen } from "../../src/features/review/ReviewScreen";
import type { ReviewAdjustment } from "../../src/features/review/reviewAdjustment";
import { createReviewEvidenceProjection } from "../../src/domain/source/reviewEvidence";
import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import {
  validDraftInterpretationResult,
  validParsedTripDraft,
} from "../fixtures/contracts/validContracts";

const document: UnifiedSourceDocument = {
  schema_version: "unified-source-document.v1",
  source_id: "source:fixture-001",
  display_name: "fixture.md",
  input_mode: "pasted_markdown",
  source_format: "markdown",
  evidence_units: [
    {
      id: "source-block:001",
      source_order: 0,
      parent_ref: null,
      locator: "paste:lines:1-1",
      raw_value: "10:30 Arrive at Osaka",
      display_value: "10:30 Arrive at Osaka",
      links: [],
      structural_evidence: [
        {
          evidence_kind: "markdown_block",
          block_type: "paragraph",
          depth: 0,
          line_start: 1,
          line_end: 1,
        },
      ],
    },
  ],
  extraction_findings: [],
};

// Review consumes the evidence projection, never the document. Branding the
// fixture through the real gate keeps these tests honest about what Review can
// actually be handed.
function evidenceFor(value: UnifiedSourceDocument) {
  const result = validateUnifiedSourceDocument(value, {
    source_id: value.source_id,
  });
  if (!result.valid) throw new Error("fixture must satisfy the source gate");
  return createReviewEvidenceProjection(result.document);
}

function Harness({
  initialDraft = validParsedTripDraft,
  interpretation = validDraftInterpretationResult,
  onCancel = vi.fn(),
  onConfirm = vi.fn(),
  adjustments = [],
}: {
  initialDraft?: ParsedTripDraft;
  interpretation?: SemanticInterpretationResult;
  onCancel?: () => void;
  onConfirm?: () => void;
  adjustments?: ReviewAdjustment[];
}) {
  const [draft, setDraft] = useState<ParsedTripDraft>(() =>
    structuredClone(initialDraft),
  );
  return (
    <ReviewScreen
      adjustments={adjustments}
      evidence={evidenceFor(document)}
      draft={draft}
      interpretation={interpretation}
      onCancel={onCancel}
      onConfirm={onConfirm}
      onDraftChange={setDraft}
      originalDraft={initialDraft}
    />
  );
}

describe("ReviewScreen", () => {
  it("starts as an exception-led checkpoint and opens complete editors through an accessible disclosure", async () => {
    const user = userEvent.setup();
    const adjustedDraft = structuredClone(validParsedTripDraft);
    adjustedDraft.entities[0]!.time.raw_text = "6:30";
    const before = {
      kind: "exact" as const,
      start: "06:30",
      end: null,
      daypart: null,
      raw_text: "6:30",
      crosses_midnight: false,
    };
    const after = structuredClone(adjustedDraft.entities[0]!.time);
    const adjustments: ReviewAdjustment[] = [
      {
        id: "adjustment:unsupported-clock:test",
        kind: "unsupported_clock_precision_downgrade",
        finding_id: "finding:local-fidelity:test",
        entity_id: adjustedDraft.entities[0]!.id,
        source_refs: ["source-block:001"],
        before,
        after,
      },
    ];

    render(<Harness initialDraft={adjustedDraft} adjustments={adjustments} />);

    expect(screen.getByText("One day")).toBeVisible();
    expect(screen.getByText("1 天 · 1 筆行程")).toBeVisible();
    expect(screen.getByText("系統保守調整 1 項")).toBeVisible();
    expect(screen.getByText(/6:30/)).toBeVisible();
    expect(screen.getByText("沒有需要你決定的問題")).toBeVisible();
    expect(
      screen.queryByRole("textbox", { name: /^標題$/ }),
    ).not.toBeInTheDocument();

    const disclosure = screen.getByRole("button", {
      name: "查看完整校對內容",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    disclosure.focus();
    await user.keyboard("{Enter}");

    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("textbox", { name: /^標題$/ })).toHaveValue(
      "Arrive",
    );
    expect(
      screen.getAllByRole("button", { name: "確認並使用這份行程" }),
    ).toHaveLength(1);
  });

  it("keeps an unknown day date editable and clearable without inventing a date or logging errors", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.trip.start_date = null;
    draft.trip.end_date = null;
    draft.days[0]!.date = null;
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(<Harness initialDraft={draft} />);
      fireEvent.click(screen.getByRole("button", { name: "查看完整校對內容" }));
      const date = screen.getByLabelText("日期", {
        exact: true,
        selector: "input",
      });
      expect(date).toHaveValue("");
      fireEvent.change(date, { target: { value: "2027-06-25" } });
      expect(date).toHaveValue("2027-06-25");
      fireEvent.change(date, { target: { value: "" } });
      expect(date).toHaveValue("");
      expect(screen.queryByText("SCHEMA_INVALID")).not.toBeInTheDocument();
      expect(errors).not.toHaveBeenCalled();
    } finally {
      errors.mockRestore();
    }
  });

  it("retains absent facts and an ambiguous raw clock without forcing factual completion", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.trip.title = null;
    draft.trip.start_date = null;
    draft.trip.end_date = null;
    draft.days[0]!.date = null;
    draft.entities[0]!.time = {
      kind: "none",
      start: null,
      end: null,
      daypart: null,
      raw_text: "七點",
      crosses_midnight: false,
    };
    const interpretation = structuredClone(validDraftInterpretationResult);
    interpretation.findings = [
      {
        // Provider flags are advisory for faithfully representable ambiguity.
        // Review policy must still keep confirmation available.
        blocking: true,
        code: "AMBIGUOUS_CLOCK_FORMAT",
        message: "七點沒有足夠證據判定上午或下午。",
        entity_refs: [draft.entities[0]!.id],
        source_refs: ["source-block:001"],
        severity: "review",
      },
    ];

    render(<Harness initialDraft={draft} interpretation={interpretation} />);
    fireEvent.click(screen.getByRole("button", { name: "查看完整校對內容" }));

    expect(screen.getByLabelText("行程名稱")).toHaveValue("");
    expect(
      screen.getByLabelText("日期", { exact: true, selector: "input" }),
    ).toHaveValue("");
    expect(screen.getByText("AMBIGUOUS_CLOCK_FORMAT")).toBeVisible();
    expect(screen.getByText(/七點沒有足夠證據/)).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "時間精度" }),
    ).toHaveTextContent("沒有時間");
    expect(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    ).toBeEnabled();
  });

  it("shows source evidence before editable content and exposes correction actions", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "查看完整校對內容" }));

    const tripEvidence = screen.getAllByText("10:30 Arrive at Osaka")[0];
    const tripTitle = screen.getByLabelText("行程名稱");
    expect(
      tripEvidence.compareDocumentPosition(tripTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByText("10:30 Arrive at Osaka").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByLabelText("標題")).toHaveValue("Arrive");
    expect(
      screen.getByRole("button", { name: "新增漏掉的內容" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    ).toBeEnabled();
    expect(screen.getAllByRole("blockquote")[0]).toHaveClass("font-source");
  });

  it("keeps original-to-new visibility and independent state flags", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "查看完整校對內容" }));

    const title = screen.getByLabelText("標題");
    await user.clear(title);
    await user.type(title, "Corrected arrival");
    expect(screen.getByText("原始：Arrive")).toBeVisible();
    expect(screen.getByText("你的校正")).toBeVisible();

    await user.click(screen.getByRole("checkbox", { name: "可選行程" }));
    await user.click(screen.getByRole("checkbox", { name: "暫定" }));
    await user.click(screen.getByRole("checkbox", { name: "時間有彈性" }));
    expect(screen.getByRole("checkbox", { name: "可選行程" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "暫定" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "時間有彈性" })).toBeChecked();
    expect(screen.getByText(/已保留你的修改/)).toBeVisible();
  });

  it("adds, deletes, reverts, cancels, and confirms through explicit controls", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<Harness onCancel={onCancel} onConfirm={onConfirm} />);
    await user.click(screen.getByRole("button", { name: "查看完整校對內容" }));

    await user.click(screen.getByRole("button", { name: "新增漏掉的內容" }));
    expect(screen.getByDisplayValue("新增行程")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "移除這筆新增內容" }));
    expect(screen.queryByDisplayValue("新增行程")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "取消匯入，保留目前行程" }),
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.click(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders broken evidence, unparsed items, and preserved references individually", () => {
    const evidenceDocument = structuredClone(document);
    evidenceDocument.extraction_findings = [
      {
        code: "MISSING_RELATIVE_ASSET",
        message: "Relative image is missing.",
        severity: "warning",
        evidence_unit_ref: "source-block:001",
        locator: "paste:lines:1-1",
        target: "./missing.png",
      },
    ];
    const draft = structuredClone(validParsedTripDraft);
    draft.entities[0].actions = [
      {
        id: "action:preserved",
        kind: "reference",
        label: "Original booking page",
        url: "https://example.com/original-booking",
      },
    ];
    const interpretation = structuredClone(validDraftInterpretationResult);
    interpretation.coverage.unparsed_items = [
      {
        source_ref: "source-block:001",
        locator: "paste:lines:1-1",
        reason_code: "ambiguous_note",
        severity: "warning",
        message: "This note remains ambiguous.",
      },
    ];

    render(
      <ReviewScreen
        adjustments={[]}
        evidence={evidenceFor(evidenceDocument)}
        draft={draft}
        interpretation={interpretation}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onDraftChange={() => undefined}
        originalDraft={validParsedTripDraft}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "查看完整校對內容" }));

    expect(screen.getByText("Relative image is missing.")).toBeVisible();
    expect(screen.getByText("This note remains ambiguous.")).toBeVisible();
    expect(screen.getAllByText("需要留意").length).toBeGreaterThan(1);
    expect(screen.getByText("保留的參考連結")).toBeVisible();
    expect(
      screen.getByText(
        "Original booking page · https://example.com/original-booking",
      ),
    ).toBeVisible();
  });

  it("keeps unusually long source evidence readable without truncating it", () => {
    const longEvidence =
      "這是一段非常長的來源內容，包含完整地址、預約規則與不能遺失的補充說明。".repeat(
        12,
      );
    const longDocument = structuredClone(document);
    longDocument.evidence_units[0]!.raw_value = longEvidence;
    longDocument.evidence_units[0]!.display_value = longEvidence;

    render(
      <ReviewScreen
        adjustments={[]}
        evidence={evidenceFor(longDocument)}
        draft={validParsedTripDraft}
        interpretation={validDraftInterpretationResult}
        onCancel={() => undefined}
        onConfirm={() => undefined}
        onDraftChange={() => undefined}
        originalDraft={validParsedTripDraft}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "查看完整校對內容" }));

    const excerpt = screen.getAllByText(longEvidence)[0];
    expect(excerpt).toHaveClass("whitespace-pre-wrap", "break-words");
    expect(excerpt).not.toHaveClass("truncate");
  });

  it("enables confirmation only after the last correctable blocker is fixed", async () => {
    const user = userEvent.setup();
    const draft = structuredClone(validParsedTripDraft);
    draft.entities[0].time = {
      kind: "exact",
      start: null,
      end: null,
      daypart: null,
      raw_text: "10:30",
      crosses_midnight: false,
    };
    const interpretation = structuredClone(validDraftInterpretationResult);
    interpretation.findings = [
      {
        blocking: true,
        code: "TIME_SHAPE_INVALID",
        message: "Exact time needs a start.",
        entity_refs: [draft.entities[0].id],
        source_refs: ["source-block:001"],
      },
    ];

    render(<Harness initialDraft={draft} interpretation={interpretation} />);

    const confirm = screen.getByRole("button", {
      name: "確認並使用這份行程",
    });
    expect(screen.getByText("TIME_SHAPE_INVALID")).toBeVisible();
    expect(confirm).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "查看完整校對內容" }));

    await user.type(screen.getByLabelText("開始"), "10:30");

    expect(screen.queryByText("TIME_SHAPE_INVALID")).not.toBeInTheDocument();
    expect(confirm).toBeEnabled();
  });

  it("keeps non-deterministic blocking findings after unrelated corrections", async () => {
    const user = userEvent.setup();
    const interpretation = structuredClone(validDraftInterpretationResult);
    interpretation.findings = [
      {
        blocking: true,
        code: "AMBIGUOUS_BOOKING_REFERENCE",
        message: "Choose which booking reference applies.",
        entity_refs: [validParsedTripDraft.entities[0].id],
        source_refs: ["source-block:001"],
      },
    ];

    render(<Harness interpretation={interpretation} />);
    await user.click(screen.getByRole("button", { name: "查看完整校對內容" }));
    await user.type(screen.getByLabelText("備註"), "Checked title");

    expect(screen.getByText("AMBIGUOUS_BOOKING_REFERENCE")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", {
        name: "確認已解決 AMBIGUOUS_BOOKING_REFERENCE",
      }),
    );

    expect(
      screen.queryByText("AMBIGUOUS_BOOKING_REFERENCE"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("USER_RESOLVED_FINDING")).toBeVisible();
    expect(screen.getByText(/你已對照原文確認/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "確認並使用這份行程" }),
    ).toBeEnabled();
  });
});
