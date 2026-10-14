import { describe, expect, it } from "vitest";

import { clockExpressionsIn } from "../../src/domain/source/clockExpression";
import { validateInterpretationFidelity } from "../../src/domain/source/validateInterpretationFidelity";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { extractMarkdownSource } from "../../src/features/import/markdownSourceAdapter";
import { applyConservativeReviewAdjustments } from "../../src/features/review/reviewAdjustment";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";
import { validTabularSourceDocument } from "../fixtures/contracts/sourceDocuments";

function clockFixture(sourceText: string, rawText = sourceText) {
  const extracted = extractMarkdownSource({
    schema_version: "text-source-input.v1",
    source_id: "source:clock-fidelity",
    input_mode: "pasted_markdown",
    media_type: "text/markdown",
    content: `# Trip\n\n${sourceText}`,
    display_name: "Clock fixture",
  });
  const gate = validateUnifiedSourceDocument(extracted, {
    source_id: extracted.source_id,
  });
  if (!gate.valid) throw new Error("Clock source must validate.");
  const result = structuredClone(validDraftInterpretationResult);
  result.source_id = extracted.source_id;
  result.draft!.days = [];
  const entity = result.draft!.entities[0]!;
  entity.day_id = null;
  entity.source_refs = [extracted.evidence_units[1]!.id];
  entity.time = {
    kind: "exact",
    start: "12:00",
    end: null,
    daypart: null,
    raw_text: rawText,
    crosses_midnight: false,
  };
  return { result, entity, source: gate.document };
}

describe("source-backed bounded clock fidelity", () => {
  it("detects unsupported Arabic 12點 precision and preserves the provider expression during conservative recovery", () => {
    const { result, entity, source } = clockFixture("12點集合", "12點");
    const original = structuredClone(result);
    const findings = validateInterpretationFidelity(result, source);

    expect(findings).toEqual([
      expect.objectContaining({
        code: "AMBIGUOUS_CLOCK_PRECISION_INFERRED",
        blocking: true,
        entity_refs: [entity.id],
        source_refs: entity.source_refs,
      }),
    ]);
    const recovery = applyConservativeReviewAdjustments({
      ...result,
      findings,
    });
    expect(recovery.candidate.entities[0]!.time).toEqual({
      kind: "none",
      start: null,
      end: null,
      daypart: null,
      raw_text: "12點",
      crosses_midnight: false,
    });
    expect(result).toEqual(original);
  });

  it.each([
    ["中午12點集合", "12點"],
    ["午夜12點集合", "12點"],
    ["12點 PM 集合", "12點"],
    ["18:30集合", "12點"],
  ])(
    "does not downgrade %s using unsupported or omitted raw context",
    (text, raw) => {
      const { result, source } = clockFixture(text, raw);
      expect(validateInterpretationFidelity(result, source)).toEqual([]);
    },
  );

  it.each([
    "00:30",
    "06:30",
    "09.30",
    "12:30",
    "12.30",
    "13:30",
    "18:30",
    "23:59",
    "24 小時制：6:30",
    "24 小時制：12點集合",
    "24 小時制：七點集合",
    "24-hour clock: 11:55",
    "112點",
    "112:30",
  ])(
    "does not classify legal 24-hour or out-of-bound notation %s as unresolved meridiem",
    (text) => {
      const { result, source } = clockFixture(text);
      expect(validateInterpretationFidelity(result, source)).toEqual([]);
    },
  );

  it.each([
    ["12 小時制：12:30集合，時段未註明", "12:30"],
    ["12-hour clock: 12.30 meeting", "12.30"],
    ["12-hour clock: 06:30集合，AM/PM未註明", "06:30"],
    ["12 小時制：09.30集合", "09.30"],
    ["6:30集合", "6:30"],
    ["5.30 頃出發", "5.30 頃"],
    ["七點左右集合", "七點左右"],
    ["十二點集合", "十二點"],
    ["12點半集合", "12點半"],
    ["12點30分集合", "12點30分"],
    ["12點集合；晚上18:00晚餐", "12點"],
  ])("detects bounded unresolved context in %s", (text, raw) => {
    const { result, source } = clockFixture(text, raw);
    expect(validateInterpretationFidelity(result, source)).toEqual([
      expect.objectContaining({ code: "AMBIGUOUS_CLOCK_PRECISION_INFERRED" }),
    ]);
  });

  it.each([
    "上午12點",
    "下午12點",
    "早上12點",
    "中午12點",
    "午夜12點",
    "凌晨12點",
    "12點AM",
    "12點 p.m.",
    "noon 12點",
    "midnight 12:30",
    "12:30pm",
    "12-hour clock: 06:30AM",
    "12 小時制：上午 09.30",
  ])("respects explicit source daypart in %s", (text) => {
    const { result, source } = clockFixture(text);
    expect(validateInterpretationFidelity(result, source)).toEqual([]);
  });

  it.each(["approximate", "daypart"] as const)(
    "detects unsupported %s precision at 12點",
    (kind) => {
      const { result, entity, source } = clockFixture("12點集合", "12點");
      entity.time.kind = kind;
      entity.time.start = kind === "daypart" ? null : "12:00";
      entity.time.daypart = kind === "daypart" ? "afternoon" : null;
      expect(validateInterpretationFidelity(result, source)).toEqual([
        expect.objectContaining({ code: "AMBIGUOUS_CLOCK_PRECISION_INFERRED" }),
      ]);
    },
  );

  it("does not attribute another unit's clock to an entity or invent a finding from an unresolved reference", () => {
    const { result, entity, source } = clockFixture("12點集合", "12點");
    entity.source_refs = [source.evidence_units[0]!.id];
    expect(validateInterpretationFidelity(result, source)).toEqual([]);
    entity.source_refs = ["source:missing"];
    expect(validateInterpretationFidelity(result, source)).toEqual([]);
  });

  it("does not flag an already unresolved 12點 or trust a daypart fabricated only in provider raw text", () => {
    const { result, entity, source } = clockFixture("12點集合", "中午12點");
    expect(validateInterpretationFidelity(result, source)).toEqual([
      expect.objectContaining({ code: "AMBIGUOUS_CLOCK_PRECISION_INFERRED" }),
    ]);
    entity.time = {
      kind: "none",
      start: null,
      end: null,
      daypart: null,
      raw_text: "12點",
      crosses_midnight: false,
    };
    expect(validateInterpretationFidelity(result, source)).toEqual([]);
  });

  it("exposes complete verbatim clock tokens, retaining attached source dayparts and Chinese notation", () => {
    expect(
      clockExpressionsIn("上午 6:30出發，七點集合，12點半午餐，6:30 P.M.晚餐"),
    ).toEqual(["上午 6:30", "七點", "12點半", "6:30 P.M."]);
    expect(
      clockExpressionsIn("6 / 點 / 112點 / 112:30 / 25:30 / 11:99"),
    ).toEqual([]);
  });

  it.each(["", "12點"])(
    "uses the visible tabular expression %j rather than its raw value",
    (displayValue) => {
      const tabular = structuredClone(validTabularSourceDocument);
      tabular.input_mode = "spreadsheet_file";
      const unit = tabular.evidence_units[1]!;
      unit.raw_value = "12點";
      unit.display_value = displayValue;
      const structural = unit.structural_evidence[0]!;
      if (structural.evidence_kind !== "tabular_region")
        throw new Error("Expected table fixture.");
      structural.cached_display_value = displayValue;
      const gate = validateUnifiedSourceDocument(tabular, {
        source_id: tabular.source_id,
      });
      if (!gate.valid) throw new Error("Table source must validate.");
      const { result, entity } = clockFixture("12點集合", "12點");
      result.source_id = tabular.source_id;
      result.draft!.trip.start_date = null;
      result.draft!.trip.end_date = null;
      entity.source_refs = [unit.id];

      expect(
        validateInterpretationFidelity(result, gate.document).map(
          (finding) => finding.code,
        ),
      ).toEqual(displayValue ? ["AMBIGUOUS_CLOCK_PRECISION_INFERRED"] : []);
    },
  );
});
