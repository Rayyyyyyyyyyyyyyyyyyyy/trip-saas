import { describe, expect, it } from "vitest";
import { assessTabularDateSupport } from "../../src/domain/source/assessTabularDateSupport";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import { deriveSupportingGroups } from "../../src/domain/trip/deriveSupportingGroups";
import { buildCanonicalTrip } from "../../src/domain/trip/buildCanonicalTrip";
import { decodeCanonicalTrip } from "../../src/domain/trip/decodeCanonicalTrip";
import { validateParsedTripDraft } from "../../src/domain/trip/validateParsedTripDraft";
import { applyConservativeReviewAdjustments } from "../../src/features/review/reviewAdjustment";
import { validTabularSourceDocument } from "../fixtures/contracts/sourceDocuments";
import { validDraftInterpretationResult } from "../fixtures/contracts/validContracts";

function fixture() {
  const table = structuredClone(validTabularSourceDocument);
  table.evidence_units[0]!.display_value = "8/16";
  const gate = validateUnifiedSourceDocument(table, {
    source_id: table.source_id,
  });
  if (!gate.valid) throw new Error("invalid fixture");
  const result = structuredClone(validDraftInterpretationResult);
  result.source_id = table.source_id;
  const draft = result.draft!;
  const refs = [table.evidence_units[0]!.id];
  draft.trip.source_refs = refs;
  draft.trip.start_date = "2025-08-16";
  draft.trip.end_date = "2025-08-16";
  draft.days[0]!.date = "2025-08-16";
  draft.days[0]!.label = null;
  draft.days[0]!.source_refs = refs;
  draft.entities[0]!.source_refs = [table.evidence_units[1]!.id];
  const assessment = assessTabularDateSupport(draft, gate.document);
  result.findings = assessment.findings;
  return { result, source: gate.document, assessment };
}

describe("closed tabular missing-year recovery", () => {
  it("preserves the visible weekday and a source-backed Day description", () => {
    const { result, source } = fixture();
    source.evidence_units[0]!.display_value = "8/16（日）京都散步";
    result.draft!.days[0]!.label = "京都散步";
    result.draft!.days[0]!.title = null;
    const dates = assessTabularDateSupport(result.draft!, source);
    result.findings = dates.findings;
    const adjusted = applyConservativeReviewAdjustments(
      result,
      dates.dateDecisions,
    );
    const canonical = buildCanonicalTrip(
      deriveSupportingGroups(adjusted.candidate, source),
      { sourceId: source.source_id },
    );
    expect(canonical.days[0]!.label).toBe("8/16（日）京都散步");
    expect(canonical.days[0]!.date).toBe(null);
    expect(result.draft!.days[0]!.label).toBe("京都散步");
  });
  it("retains a Day label while removing an unsupported full date prefix", () => {
    const { result, assessment } = fixture();
    result.draft!.days[0]!.label = "2025-08-16 京都散步";
    const adjusted = applyConservativeReviewAdjustments(
      result,
      assessment.dateDecisions,
    );
    expect(adjusted.candidate.days[0]!.label).toBe("京都散步 · 8/16");
  });
  it("preserves the original interpretation and confirms readable partial dates through canonical reload", () => {
    const { result, source, assessment } = fixture();
    const original = structuredClone(result);
    const adjusted = applyConservativeReviewAdjustments(
      result,
      assessment.dateDecisions,
    );
    expect(result).toEqual(original);
    expect(adjusted.adjustments).toHaveLength(3);
    expect(adjusted.candidate.trip).toMatchObject({
      start_date: null,
      end_date: null,
    });
    expect(adjusted.candidate.days[0]).toMatchObject({
      date: null,
      label: "8/16",
    });
    expect(
      adjusted.candidate.supporting_items.some((item) => item.text === "8/16"),
    ).toBe(true);
    const draft = deriveSupportingGroups(adjusted.candidate, source);
    expect(
      validateParsedTripDraft(
        draft,
        source.evidence_units.map((item) => item.id),
      ).valid,
    ).toBe(true);
    const canonical = buildCanonicalTrip(draft, { sourceId: source.source_id });
    const reloaded = decodeCanonicalTrip(JSON.parse(JSON.stringify(canonical)));
    expect(reloaded.valid).toBe(true);
    if (!reloaded.valid) throw new Error("invalid canonical");
    expect(reloaded.trip.days[0]).toMatchObject({ date: null, label: "8/16" });
    expect(JSON.stringify(canonical)).not.toContain("dateDecisions");
    expect(JSON.stringify(canonical)).not.toContain("typed_hint");
  });
  it("does not accept a provider finding as a date adjustment decision", () => {
    const { result } = fixture();
    expect(applyConservativeReviewAdjustments(result).candidate).toEqual(
      result.draft,
    );
  });
  it("rejects stale targets, changed source references and a missing local finding", () => {
    for (const change of ["date", "refs", "finding"] as const) {
      const { result, assessment } = fixture();
      const decision = assessment.dateDecisions.find(
        (item) => item.target.kind === "day",
      )!;
      if (change === "date") result.draft!.days[0]!.date = null;
      if (change === "refs") result.draft!.days[0]!.source_refs = [];
      if (change === "finding") result.findings = [];
      const adjusted = applyConservativeReviewAdjustments(result, [decision]);
      expect(adjusted.adjustments).toEqual([]);
      expect(adjusted.candidate).toEqual(result.draft);
    }
  });
});
