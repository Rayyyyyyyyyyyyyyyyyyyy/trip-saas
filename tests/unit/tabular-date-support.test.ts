import { describe, expect, it } from "vitest";
import { assessTabularDateSupport } from "../../src/domain/source/assessTabularDateSupport";
import type {
  TabularStructuralEvidence,
  UnifiedSourceDocument,
} from "../../src/domain/source/types";
import { validateInterpretationFidelity } from "../../src/domain/source/validateInterpretationFidelity";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { validateSemanticInterpretationResultSchema } from "../../src/domain/trip/schemaValidators";
import { extractMarkdownSource } from "../../src/features/import/markdownSourceAdapter";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

function table(texts = ["8/16–8/20", "2026年其他行程"]) {
  const source: UnifiedSourceDocument = {
    schema_version: "unified-source-document.v1",
    source_id: "source:tabular-date-support",
    display_name: "2026-workbook.xlsx",
    input_mode: "spreadsheet_file",
    source_format: "tabular",
    evidence_units: texts.map((text, index) => ({
      id: `cell:${index}`,
      source_order: index,
      parent_ref: null,
      locator: `sheet:2026行程!A${index + 1}`,
      raw_value: text,
      display_value: text,
      links: [],
      structural_evidence: [
        {
          evidence_kind: "tabular_region",
          sheet_id: "sheet:0",
          sheet_name: "2026行程",
          sheet_order: 0,
          row_start: index + 1,
          row_end: index + 1,
          column_start: 1,
          column_end: 1,
          header_ref: null,
          merge_ref: null,
        },
      ],
    })),
    extraction_findings: [],
  };
  return source;
}

function validated(source: UnifiedSourceDocument) {
  const gate = validateUnifiedSourceDocument(source, {
    source_id: source.source_id,
  });
  if (!gate.valid) throw new Error(JSON.stringify(gate.failures));
  return gate.document;
}

function draft() {
  const result = structuredClone(validDraftInterpretationResult);
  result.draft!.trip.start_date = "2026-08-16";
  result.draft!.trip.end_date = "2026-08-20";
  result.draft!.trip.source_refs = ["cell:0"];
  result.draft!.days[0]!.date = "2026-08-16";
  result.draft!.days[0]!.source_refs = ["cell:0"];
  return result;
}

describe("visible tabular date support", () => {
  it("assesses all three date targets without changing the recorded draft or source", () => {
    const source = validated(table());
    const result = draft();
    const beforeSource = structuredClone(source);
    const beforeResult = structuredClone(result);
    const assessment = assessTabularDateSupport(result.draft!, source);

    expect(assessment.dateDecisions).toEqual([
      expect.objectContaining({
        target: { kind: "trip", field: "start_date" },
        before: "2026-08-16",
        source_refs: ["cell:0"],
        partial_text: "8/16–8/20",
      }),
      expect.objectContaining({
        target: { kind: "trip", field: "end_date" },
        before: "2026-08-20",
        source_refs: ["cell:0"],
        partial_text: "8/16–8/20",
      }),
      expect.objectContaining({
        target: {
          kind: "day",
          day_id: result.draft!.days[0]!.id,
          field: "date",
        },
        before: "2026-08-16",
        source_refs: ["cell:0"],
        partial_text: "8/16–8/20",
      }),
    ]);
    expect(assessment.findings).toHaveLength(3);
    expect(new Set(assessment.findings.map((finding) => finding.id)).size).toBe(
      3,
    );
    for (const finding of assessment.findings) {
      expect(finding).toMatchObject({
        id: expect.stringMatching(/^finding:local-fidelity:missing_year:/),
        code: "MISSING_YEAR",
        blocking: false,
        severity: "review",
        entity_refs: [],
        source_refs: ["cell:0"],
      });
    }
    expect(assessTabularDateSupport(result.draft!, source)).toEqual(assessment);
    expect(validateInterpretationFidelity(result, source)).toEqual(
      assessment.findings,
    );
    expect(
      validateSemanticInterpretationResultSchema({
        ...result,
        findings: assessment.findings,
      }).valid,
    ).toBe(true);
    expect(source).toEqual(beforeSource);
    expect(result).toEqual(beforeResult);
  });

  it("accepts the cited displayed year and leaves legal null dates alone", () => {
    const source = validated(table(["2026年8月16日–8月20日"]));
    const result = draft();
    expect(assessTabularDateSupport(result.draft!, source)).toEqual({
      findings: [],
      dateDecisions: [],
    });
    result.draft!.trip.start_date = null;
    result.draft!.trip.end_date = null;
    result.draft!.days[0]!.date = null;
    expect(assessTabularDateSupport(result.draft!, validated(table()))).toEqual(
      {
        findings: [],
        dateDecisions: [],
      },
    );
  });

  it("does not borrow a year from raw values, typed hints, metadata or unrelated display text", () => {
    const document = table();
    document.evidence_units[0]!.raw_value = "2026-08-16";
    const evidence = document.evidence_units[0]!
      .structural_evidence[0] as TabularStructuralEvidence;
    evidence.typed_hint = {
      kind: "date_serial",
      value: 46250,
      date_system: "1900",
    };
    evidence.cached_display_value = "2026-08-16";
    evidence.formula = "DATE(2026,8,16)";
    const assessment = assessTabularDateSupport(
      draft().draft!,
      validated(document),
    );
    expect(assessment.findings).toHaveLength(3);
    expect(assessment.dateDecisions[0]!.partial_text).toBe("8/16–8/20");
  });

  it("does not treat a longer visible number as the target year", () => {
    expect(
      assessTabularDateSupport(
        draft().draft!,
        validated(table(["訂單 20260 · 8/16"])),
      ).findings,
    ).toHaveLength(3);
  });

  it("excludes hidden covered-cell content from visible date evidence", () => {
    const document = table(["8/16", "2026"]);
    const anchor = document.evidence_units[0]!;
    const covered = document.evidence_units[1]!;
    anchor.locator = "sheet:2026行程!A1:B1";
    const anchorEvidence = anchor
      .structural_evidence[0] as TabularStructuralEvidence;
    anchorEvidence.column_end = 2;
    anchorEvidence.merge_ref = anchor.locator;
    covered.locator = "sheet:2026行程!B1";
    covered.parent_ref = anchor.id;
    const coveredEvidence = covered
      .structural_evidence[0] as TabularStructuralEvidence;
    coveredEvidence.row_start = coveredEvidence.row_end = 1;
    coveredEvidence.column_start = coveredEvidence.column_end = 2;
    coveredEvidence.merge_ref = anchor.locator;
    document.extraction_findings.push({
      code: "COVERED_CELL_CONTENT",
      severity: "warning",
      message: "Hidden content",
      evidence_unit_ref: covered.id,
      locator: covered.locator,
      target: "B1",
    });
    const result = draft();
    result.draft!.trip.source_refs = [anchor.id, covered.id];
    result.draft!.days[0]!.source_refs = [anchor.id, covered.id];
    const assessment = assessTabularDateSupport(
      result.draft!,
      validated(document),
    );
    expect(assessment.findings).toHaveLength(3);
    expect(assessment.dateDecisions[0]).toMatchObject({
      source_refs: [anchor.id, covered.id],
      partial_text: "8/16",
    });
  });

  it("retains cited original text when no matching partial date exists, with a bounded summary", () => {
    const result = draft();
    const raw = "夏日假期".repeat(1500);
    const assessment = assessTabularDateSupport(
      result.draft!,
      validated(table([raw])),
    );
    expect(assessment.dateDecisions[0]!.partial_text).toBe(
      `${raw.slice(0, 3999)}…`,
    );
    expect(assessment.dateDecisions[0]!.source_refs).toEqual(["cell:0"]);
    expect(
      assessTabularDateSupport(result.draft!, validated(table(["8月16日"])))
        .dateDecisions[0]!.partial_text,
    ).toBe("8月16日");
  });

  it("retains the complete matching displayed date cell, including its weekday and theme", () => {
    const result = draft();
    result.draft!.days[0]!.label = "京都散步";
    result.draft!.days[0]!.title = null;
    const text = "8/16（日）京都散步";
    const assessment = assessTabularDateSupport(
      result.draft!,
      validated(table([text])),
    );
    expect(
      assessment.dateDecisions.find(
        (decision) => decision.target.kind === "day",
      ),
    ).toMatchObject({
      before: "2026-08-16",
      partial_text: text,
      source_refs: ["cell:0"],
    });
    expect(result.draft!.days[0]!.label).toBe("京都散步");
  });

  it("marks a bounded matching-cell summary with elision and retains all cited evidence references", () => {
    const result = draft();
    result.draft!.trip.source_refs = ["cell:0", "cell:1"];
    const text = "8/16（日）京都散步 " + "🌸".repeat(3000);
    const source = validated(table([text, "交通說明"]));
    const decision = assessTabularDateSupport(result.draft!, source)
      .dateDecisions[0]!;
    expect(decision.partial_text!.length).toBeLessThanOrEqual(4000);
    expect(decision.partial_text).toMatch(/^8\/16（日）京都散步 /u);
    expect(decision.partial_text).toMatch(/🌸…$/u);
    expect(decision.source_refs).toEqual(["cell:0", "cell:1"]);
    expect(source.evidence_units[0]!.display_value).toBe(text);
  });

  it("does not construct partial text when there is no visible cited text", () => {
    const result = draft();
    result.draft!.trip.source_refs = [];
    result.draft!.days[0]!.source_refs = [];
    const assessment = assessTabularDateSupport(
      result.draft!,
      validated(table()),
    );
    expect(
      assessment.dateDecisions.every(
        (decision) => decision.partial_text === null,
      ),
    ).toBe(true);
    expect(
      assessment.findings.every((finding) => finding.source_refs?.length === 0),
    ).toBe(true);
  });
});

describe("format-appropriate fidelity checks", () => {
  it("does not apply linear Markdown Day regions to column-per-day tables, while keeping clock checks", () => {
    const document = table(["8/16", "8/17", "7:00 參觀"]);
    const second = document.evidence_units[1]!;
    const evidence = second.structural_evidence[0] as TabularStructuralEvidence;
    second.locator = "sheet:2026行程!B1";
    evidence.row_start = evidence.row_end = 1;
    evidence.column_start = evidence.column_end = 2;
    const third = document.evidence_units[2]!;
    const thirdEvidence = third
      .structural_evidence[0] as TabularStructuralEvidence;
    third.locator = "sheet:2026行程!A2";
    thirdEvidence.row_start = thirdEvidence.row_end = 2;
    const source = validated(document);
    const result = draft();
    result.draft!.trip.start_date = result.draft!.trip.end_date = null;
    result.draft!.days[0]!.date = null;
    result.draft!.days.push({
      ...structuredClone(result.draft!.days[0]!),
      id: "day:second",
      source_order: 1,
      source_refs: ["cell:1"],
    });
    result.draft!.entities[0]!.source_refs = ["cell:2"];
    expect(validateInterpretationFidelity(result, source)).toEqual([]);
    result.draft!.entities[0]!.time = {
      kind: "exact",
      start: "07:00",
      end: null,
      daypart: null,
      raw_text: "7:00",
      crosses_midnight: false,
    };
    expect(
      validateInterpretationFidelity(result, source).map(
        (finding) => finding.code,
      ),
    ).toEqual(["AMBIGUOUS_CLOCK_PRECISION_INFERRED"]);
  });

  it("retains the existing Markdown Day-binding gate and leaves Markdown year policy unchanged", () => {
    const source = validated(
      extractMarkdownSource({
        schema_version: "text-source-input.v1",
        source_id: "source:markdown-control",
        input_mode: "pasted_markdown",
        media_type: "text/markdown",
        display_name: "Control",
        content: "# First day\n\nFirst event\n\n# Second day\n\nSecond event",
      }),
    );
    const result = draft();
    result.draft!.days[0]!.source_refs = [source.evidence_units[0]!.id];
    result.draft!.days.push({
      ...structuredClone(result.draft!.days[0]!),
      id: "day:second",
      source_order: 1,
      source_refs: [source.evidence_units[2]!.id],
    });
    result.draft!.entities[0]!.source_refs = [source.evidence_units[3]!.id];
    expect(assessTabularDateSupport(result.draft!, source)).toEqual({
      findings: [],
      dateDecisions: [],
    });
    expect(
      validateInterpretationFidelity(result, source).map(
        (finding) => finding.code,
      ),
    ).toEqual(["DAY_BINDING_NOT_SOURCE_SUPPORTED"]);
  });
});
