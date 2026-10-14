import { describe, expect, it, vi } from "vitest";
import { createReviewEvidenceProjection } from "../../src/domain/source/reviewEvidence";
import { validateUnifiedSourceDocument } from "../../src/domain/source/validateUnifiedSourceDocument";
import {
  deriveReviewFindings,
  editReviewTrip,
  editReviewDay,
  editReviewEntity,
  resolveReviewFinding,
  revertEntityCorrection,
  deleteFalseEntity,
} from "../../src/features/review/reviewCandidate";
import {
  recordReviewCorrection,
  type ReviewCorrection,
  type ReviewFindingContext,
} from "../../src/features/review/reviewPreservation";
import { confirmReviewedTrip } from "../../src/features/review/confirmReviewedTrip";
import { validMarkdownSourceDocument } from "../fixtures/contracts/sourceDocuments";
import {
  validDraftInterpretationResult,
  validParsedTripDraft,
} from "../fixtures/contracts/validContracts";
import type { TripFinding } from "../../src/domain/trip/types";

function fixture(text = "七點 散步") {
  const source = structuredClone(validMarkdownSourceDocument);
  source.evidence_units = [source.evidence_units[0]!];
  source.evidence_units[0]!.raw_value = text;
  source.evidence_units[0]!.display_value = text;
  source.extraction_findings = [];
  const gate = validateUnifiedSourceDocument(source, {
    source_id: source.source_id,
  });
  if (!gate.valid) throw new Error("invalid fixture");
  const ref = source.evidence_units[0]!.id;
  const draft = structuredClone(validParsedTripDraft);
  draft.trip.source_refs = [ref];
  draft.days[0]!.source_refs = [ref];
  draft.entities[0]!.source_refs = [ref];
  draft.entities[0]!.time = {
    kind: "none",
    start: null,
    end: null,
    daypart: null,
    raw_text: "七點",
    crosses_midnight: false,
  };
  const context: ReviewFindingContext = {
    evidence: createReviewEvidenceProjection(gate.document),
    corrections: [],
  };
  const finding: TripFinding = {
    id: "finding:clock",
    code: "AMBIGUOUS_CLOCK",
    message: "No supported daypart",
    blocking: true,
    severity: "review",
    entity_refs: [draft.entities[0]!.id],
    source_refs: [ref],
  };
  return { draft, context, finding, ref };
}
const lookup = (value: ReturnType<typeof fixture>) =>
  deriveReviewFindings(value.draft, [value.finding], value.context).find(
    (finding) => finding.id === value.finding.id,
  )!;

describe("source-linked Review preservation", () => {
  it("blocks an invented exact clock despite provider preservation code", () => {
    const value = fixture();
    value.draft.entities[0]!.time = {
      ...value.draft.entities[0]!.time,
      kind: "exact",
      start: "19:00",
    };
    expect(lookup(value).blocking).toBe(true);
    expect(resolveReviewFinding(value.draft, value.finding)).toEqual(
      value.draft,
    );
  });
  it("retains a verbatim source clock as an informative unknown", () => {
    expect(lookup(fixture()).blocking).toBe(false);
  });
  it.each(["7:00", "點", "八點", ""])(
    "blocks substituted or incomplete raw expression %s",
    (raw) => {
      const value = fixture();
      value.draft.entities[0]!.time.raw_text = raw;
      expect(lookup(value).blocking).toBe(true);
    },
  );
  it.each(["missing", "empty", "unrelated", "no-context"])(
    "blocks unresolved scope: %s",
    (mode) => {
      const value = fixture();
      if (mode === "missing") value.finding.source_refs = ["source:missing"];
      if (mode === "empty") value.finding.source_refs = [];
      if (mode === "unrelated") value.finding.entity_refs = ["entity:missing"];
      expect(
        deriveReviewFindings(
          value.draft,
          [value.finding],
          mode === "no-context" ? undefined : value.context,
        ).find((finding) => finding.id === value.finding.id)?.blocking,
      ).toBe(true);
    },
  );
  it("does not mistake incidental evidence context for the cited clock", () => {
    const value = fixture("Trip summary without a clock");
    expect(lookup(value).blocking).toBe(true);
  });
  it("allows one semantic unit's clock in a paragraph with several clocks", () => {
    const value = fixture("七點 散步，八點 回飯店");
    expect(lookup(value).blocking).toBe(false);
  });
  it.each(["start", "end", "daypart", "crosses_midnight"])(
    "blocks contradictory precision in a none shape: %s",
    (field) => {
      const value = fixture();
      if (field === "start") value.draft.entities[0]!.time.start = "19:00";
      if (field === "end") value.draft.entities[0]!.time.end = "20:00";
      if (field === "daypart")
        value.draft.entities[0]!.time.daypart = "evening";
      if (field === "crosses_midnight")
        value.draft.entities[0]!.time.crosses_midnight = true;
      expect(lookup(value).blocking).toBe(true);
    },
  );
  it("reconciles a valid explicit time edit, but not provider-authored user provenance", () => {
    const value = fixture();
    const next = editReviewEntity(
      value.draft,
      value.draft.entities[0]!.id,
      "time",
      (entity) => {
        entity.time.kind = "exact";
        entity.time.start = "19:00";
      },
    );
    const corrections = recordReviewCorrection(value.draft, next, [], {
      kind: "entity",
      id: next.entities[0]!.id,
      field: "time",
    });
    expect(
      deriveReviewFindings(next, [value.finding], {
        ...value.context,
        corrections,
      }),
    ).toContainEqual(
      expect.objectContaining({
        code: "USER_CORRECTED_FINDING",
        blocking: false,
      }),
    );
    expect(
      deriveReviewFindings(next, [value.finding], value.context),
    ).toContainEqual(
      expect.objectContaining({ code: "AMBIGUOUS_CLOCK", blocking: true }),
    );
  });
  it("reruns semantic validation, invalidates stale edits and restores blockers on revert", () => {
    const value = fixture();
    const id = value.draft.entities[0]!.id;
    let next = editReviewEntity(value.draft, id, "time", (entity) => {
      entity.time.kind = "exact";
      entity.time.start = "19:00";
    });
    let corrections = recordReviewCorrection(value.draft, next, [], {
      kind: "entity",
      id,
      field: "time",
    });
    const valid = next;
    next = editReviewEntity(next, id, "time.start", (entity) => {
      entity.time.start = "25:00";
    });
    expect(
      deriveReviewFindings(next, [value.finding], {
        ...value.context,
        corrections,
      }).some((finding) => finding.blocking),
    ).toBe(true);
    const reverted = revertEntityCorrection(valid, value.draft, id);
    corrections = recordReviewCorrection(valid, reverted, corrections, {
      kind: "revert_entity",
      id,
    });
    expect(corrections).toEqual([]);
    expect(
      deriveReviewFindings(reverted, [value.finding], {
        ...value.context,
        corrections,
      }).find((finding) => finding.id === value.finding.id)?.code,
    ).toBe("AMBIGUOUS_CLOCK");
  });
  it("does not authorize an inferred start by editing only raw text or another time field", () => {
    const value = fixture();
    value.draft.entities[0]!.time = {
      ...value.draft.entities[0]!.time,
      kind: "exact",
      start: "19:00",
      raw_text: "7:00",
    };
    const id = value.draft.entities[0]!.id;
    const repaired = editReviewEntity(
      value.draft,
      id,
      "time.raw_text",
      (entity) => {
        entity.time.raw_text = "七點";
      },
    );
    let corrections = recordReviewCorrection(value.draft, repaired, [], {
      kind: "entity",
      id,
      field: "time",
    });
    expect(corrections).toEqual([]);
    expect(
      deriveReviewFindings(repaired, [value.finding], {
        ...value.context,
        corrections,
      }),
    ).toContainEqual(
      expect.objectContaining({ code: "AMBIGUOUS_CLOCK", blocking: true }),
    );
    const withEnd = editReviewEntity(repaired, id, "time.end", (entity) => {
      entity.time.end = "20:00";
    });
    corrections = recordReviewCorrection(repaired, withEnd, corrections, {
      kind: "entity",
      id,
      field: "time",
    });
    expect(
      deriveReviewFindings(withEnd, [value.finding], {
        ...value.context,
        corrections,
      }),
    ).toContainEqual(
      expect.objectContaining({ code: "AMBIGUOUS_CLOCK", blocking: true }),
    );
  });
  it.each(["MISSING_YEAR", "MISSING_TRIP_YEAR"])(
    "requires retained partial dates for %s",
    (code) => {
      const value = fixture("8/16 京都散步");
      value.finding = { ...value.finding, code, entity_refs: [] };
      value.draft.trip.start_date = null;
      value.draft.trip.end_date = null;
      value.draft.days[0]!.date = null;
      value.draft.days[0]!.label = "8/16";
      value.draft.supporting_items = [
        {
          id: "supporting:partial",
          kind: "note",
          text: "8/16",
          url: null,
          unresolved: true,
          source_refs: [value.ref],
        },
      ];
      expect(lookup(value).blocking).toBe(false);
      value.draft.days[0]!.label = null;
      expect(lookup(value).blocking).toBe(false);
      value.draft.supporting_items = [];
      expect(lookup(value).blocking).toBe(true);
      value.draft.days[0]!.label = "8/16";
      value.draft.supporting_items = [];
      expect(lookup(value).blocking).toBe(false);
    },
  );
  it("retains two partial dates split across Days sharing one source paragraph", () => {
    const value = fixture("8/16 京都，8/17 大阪");
    value.finding = { ...value.finding, code: "MISSING_YEAR", entity_refs: [] };
    value.draft.trip.start_date = value.draft.trip.end_date = null;
    const first = value.draft.days[0]!;
    first.date = null;
    first.label = "8/16 京都";
    value.draft.days.push({
      ...structuredClone(first),
      id: "day:second",
      source_order: 2,
      label: "8/17 大阪",
    });
    expect(lookup(value).blocking).toBe(false);
    value.draft.days[1]!.label = "大阪";
    expect(lookup(value).blocking).toBe(true);
  });
  it.each(["trip", "day", "entity"])(
    "checks every date bearing target for source-linked %s scope",
    (scope) => {
      const value = fixture("8/16 京都散步");
      value.finding = {
        ...value.finding,
        code: "MISSING_YEAR",
        entity_refs: [
          scope === "trip"
            ? value.draft.trip.id
            : scope === "day"
              ? value.draft.days[0]!.id
              : value.draft.entities[0]!.id,
        ],
      };
      value.draft.trip.start_date = value.draft.trip.end_date = null;
      value.draft.days[0]!.date = null;
      value.draft.days[0]!.label = "8/16";
      expect(lookup(value).blocking).toBe(false);
      value.draft.days[0]!.date = "2026-08-16";
      expect(lookup(value).blocking).toBe(true);
      value.draft.days[0]!.date = null;
      value.draft.trip.start_date = "2026-08-16";
      expect(lookup(value).blocking).toBe(true);
      value.finding.entity_refs = ["entity:unknown"];
      expect(lookup(value).blocking).toBe(true);
    },
  );
  it("keeps a source-linked partial date on an undated event without inventing a Day", () => {
    const value = fixture("8/16 京都散步");
    value.finding = { ...value.finding, code: "MISSING_YEAR" };
    value.draft.trip.start_date = value.draft.trip.end_date = null;
    value.draft.days = [];
    value.draft.entities[0]!.day_id = null;
    value.draft.entities[0]!.notes = ["8/16 京都散步"];
    expect(lookup(value).blocking).toBe(false);
    value.draft.entities[0]!.notes = [];
    expect(lookup(value).blocking).toBe(true);
  });
  it("retires a deleted entity clock finding only after a trusted exact-ID deletion", () => {
    const value = fixture();
    const removedId = value.draft.entities[0]!.id;
    value.draft.entities.push({
      ...structuredClone(value.draft.entities[0]!),
      id: "entity:retained",
      title: "Another activity",
    });
    const next = deleteFalseEntity(value.draft, removedId);
    const corrections = recordReviewCorrection(value.draft, next, [], {
      kind: "delete_entity",
      id: removedId,
    });
    expect(
      deriveReviewFindings(next, [value.finding], {
        ...value.context,
        corrections,
      }),
    ).toContainEqual(
      expect.objectContaining({
        code: "USER_CORRECTED_FINDING",
        blocking: false,
      }),
    );
    expect(
      deriveReviewFindings(next, [value.finding], value.context),
    ).toContainEqual(
      expect.objectContaining({ code: "AMBIGUOUS_CLOCK", blocking: true }),
    );
    expect(
      recordReviewCorrection(next, next, [], {
        kind: "delete_entity",
        id: removedId,
      }),
    ).toEqual([]);
    expect(recordReviewCorrection(next, value.draft, corrections)).toEqual([]);
    value.finding.entity_refs = ["entity:unknown"];
    expect(
      deriveReviewFindings(next, [value.finding], {
        ...value.context,
        corrections,
      }),
    ).toContainEqual(
      expect.objectContaining({ code: "AMBIGUOUS_CLOCK", blocking: true }),
    );
  });
  it("does not allow year invention, acknowledgement, unrelated edits or forged resolved markers", () => {
    const value = fixture("8/16 京都散步");
    value.finding = { ...value.finding, code: "MISSING_YEAR", entity_refs: [] };
    value.draft.trip.start_date = "2026-08-16";
    value.draft.trip.end_date = "2026-08-16";
    value.draft.days[0]!.date = "2026-08-16";
    expect(lookup(value).blocking).toBe(true);
    const acknowledged = resolveReviewFinding(value.draft, value.finding);
    expect(acknowledged).toEqual(value.draft);
    const next = editReviewTrip(acknowledged, {
      title: "Unrelated correction",
    });
    expect(
      deriveReviewFindings(next, [value.finding], value.context).some(
        (finding) => finding.code === "MISSING_YEAR" && finding.blocking,
      ),
    ).toBe(true);
  });
  it("reconciles explicit trip and Day dates without mutating the original or persisting session evidence", async () => {
    const value = fixture("8/16 京都散步");
    value.finding = { ...value.finding, code: "MISSING_YEAR", entity_refs: [] };
    value.draft.trip.start_date = null;
    value.draft.trip.end_date = null;
    value.draft.days[0]!.date = null;
    value.draft.days[0]!.label = "8/16";
    const original = structuredClone(value.draft);
    let draft = value.draft;
    let corrections: ReviewCorrection[] = [];
    for (const field of ["start_date", "end_date"] as const) {
      const next = editReviewTrip(draft, { [field]: "2027-08-16" });
      corrections = recordReviewCorrection(draft, next, corrections, {
        kind: "trip",
        field,
      });
      draft = next;
    }
    const next = editReviewDay(draft, draft.days[0]!.id, {
      date: "2027-08-16",
    });
    corrections = recordReviewCorrection(draft, next, corrections, {
      kind: "day",
      id: draft.days[0]!.id,
      field: "date",
    });
    draft = next;
    const interpretation = {
      ...structuredClone(validDraftInterpretationResult),
      draft: original,
      findings: [value.finding],
      coverage: {
        total_blocks: 1,
        block_dispositions: [
          { source_ref: value.ref, disposition: "interpreted" as const },
        ],
        unparsed_items: [],
      },
    };
    const replaceActive = vi.fn();
    const canonical = await confirmReviewedTrip(
      draft,
      { replaceActive, clear: vi.fn(), loadActive: vi.fn() },
      {
        sourceId: "source:fixture-001",
        review: { ...value.context, corrections, interpretation },
      },
    );
    expect(canonical.start_date).toBe("2027-08-16");
    expect(value.draft).toEqual(original);
    expect(JSON.stringify(canonical)).not.toMatch(
      /USER_CORRECTED|corrections|MISSING_YEAR/,
    );
    expect(replaceActive).toHaveBeenCalledOnce();
  });
  it("rechecks Review blockers immediately before persistence", async () => {
    const value = fixture();
    value.draft.entities[0]!.time = {
      ...value.draft.entities[0]!.time,
      kind: "exact",
      start: "19:00",
    };
    const interpretation = {
      ...structuredClone(validDraftInterpretationResult),
      draft: structuredClone(value.draft),
      findings: [value.finding],
    };
    const replaceActive = vi.fn();
    await expect(
      confirmReviewedTrip(
        value.draft,
        { replaceActive, clear: vi.fn(), loadActive: vi.fn() },
        { review: { ...value.context, interpretation } },
      ),
    ).rejects.toMatchObject({ code: "candidate_invalid" });
    expect(replaceActive).not.toHaveBeenCalled();
  });
});
