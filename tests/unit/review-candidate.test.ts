import { describe, expect, expectTypeOf, it } from "vitest";

import type { TripTime } from "../../src/domain/trip/types";
import {
  addMissedEntity,
  deleteFalseEntity,
  deriveReviewFindings,
  deriveUnparsedItemFindings,
  editReviewDay,
  editReviewEntity,
  editReviewTrip,
  resolveReviewFinding,
  revertEntityCorrection,
  type ReviewEntityFieldPath,
} from "../../src/features/review/reviewCandidate";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

describe("review candidate editing", () => {
  it("edits trip, day, entity, place, notes, and provenance without mutating the parser draft", () => {
    const original = structuredClone(validParsedTripDraft);
    let draft = editReviewTrip(original, {
      title: "Corrected trip",
      start_date: "2026-09-11",
      end_date: "2026-09-11",
    });
    draft = editReviewDay(draft, draft.days[0].id, {
      date: "2026-09-11",
      title: "Corrected day",
    });
    draft = editReviewEntity(draft, draft.entities[0].id, "title", (entity) => {
      entity.title = "Corrected event";
      entity.semantic_type = "restaurant";
      entity.place.name = "Corrected place";
      entity.notes = ["Corrected note"];
    });

    expect(original).toEqual(validParsedTripDraft);
    expect(draft.trip).toMatchObject({
      title: "Corrected trip",
      start_date: "2026-09-11",
      end_date: "2026-09-11",
    });
    expect(draft.days[0]).toMatchObject({
      date: "2026-09-11",
      title: "Corrected day",
    });
    expect(draft.entities[0]).toMatchObject({
      title: "Corrected event",
      semantic_type: "restaurant",
      place: { name: "Corrected place" },
      notes: ["Corrected note"],
      provenance: { origin: "user", overridden_fields: ["title"] },
    });
  });

  it("keeps optional, tentative, and flexible independent", () => {
    const draft = editReviewEntity(
      validParsedTripDraft,
      validParsedTripDraft.entities[0].id,
      "state",
      (entity) => {
        entity.state.optional = true;
        entity.state.tentative = true;
        entity.state.flexible = true;
      },
    );

    expect(draft.entities[0].state).toMatchObject({
      optional: true,
      tentative: true,
      flexible: true,
    });
  });

  it.each<[TripTime]>([
    [
      {
        kind: "exact",
        start: "10:30",
        end: null,
        daypart: null,
        raw_text: "10:30",
        crosses_midnight: false,
      },
    ],
    [
      {
        kind: "approximate",
        start: "10:30",
        end: null,
        daypart: null,
        raw_text: "約 10:30",
        crosses_midnight: false,
      },
    ],
    [
      {
        kind: "range",
        start: "10:30",
        end: "12:00",
        daypart: null,
        raw_text: null,
        crosses_midnight: false,
      },
    ],
    [
      {
        kind: "daypart",
        start: null,
        end: null,
        daypart: "morning",
        raw_text: "上午",
        crosses_midnight: false,
      },
    ],
    [
      {
        kind: "none",
        start: null,
        end: null,
        daypart: null,
        raw_text: null,
        crosses_midnight: false,
      },
    ],
    [
      {
        kind: "open_ended",
        start: "18:30",
        end: null,
        daypart: null,
        raw_text: "18:30~",
        crosses_midnight: false,
      },
    ],
    [
      {
        kind: "all_day",
        start: null,
        end: null,
        daypart: null,
        raw_text: "全天",
        crosses_midnight: false,
      },
    ],
    [
      {
        kind: "range",
        start: "23:30",
        end: "01:00",
        daypart: null,
        raw_text: "23:30–翌日 01:00",
        crosses_midnight: true,
      },
    ],
  ])("accepts every supported review time shape", (time) => {
    const draft = editReviewEntity(
      validParsedTripDraft,
      validParsedTripDraft.entities[0].id,
      "time",
      (entity) => {
        entity.time = time;
      },
    );

    expect(
      deriveReviewFindings(draft).filter(
        (finding) =>
          finding.code === "TIME_SHAPE_INVALID" ||
          finding.code === "CROSS_MIDNIGHT_INVALID",
      ),
    ).toEqual([]);
  });

  it("adds stable user-authored entities and reverts or deletes them", () => {
    const added = addMissedEntity(
      validParsedTripDraft,
      validParsedTripDraft.days[0].id,
      "entity:user:stable",
    );
    expect(added.entities.at(-1)).toMatchObject({
      id: "entity:user:stable",
      day_id: validParsedTripDraft.days[0].id,
      provenance: { origin: "user", overridden_fields: [] },
      time: { kind: "none", start: null, end: null },
    });

    const removedByRevert = revertEntityCorrection(
      added,
      validParsedTripDraft,
      "entity:user:stable",
    );
    expect(removedByRevert.entities).toHaveLength(1);

    const edited = editReviewEntity(
      validParsedTripDraft,
      validParsedTripDraft.entities[0].id,
      "title",
      (entity) => {
        entity.title = "Wrong correction";
      },
    );
    expect(
      revertEntityCorrection(
        edited,
        validParsedTripDraft,
        validParsedTripDraft.entities[0].id,
      ).entities[0].title,
    ).toBe("Arrive");
  });

  it("surfaces dependent relationship references after deleting a false entity", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.relationships = [
      {
        id: "relationship:dependent",
        type: "sequence",
        member_entity_ids: [draft.entities[0].id],
        parent_entity_id: null,
        child_entity_ids: [],
        condition: null,
        source_refs: ["source-block:001"],
      },
    ];

    const deleted = deleteFalseEntity(draft, draft.entities[0].id);
    expect(
      deriveReviewFindings(deleted).some((finding) => finding.blocking),
    ).toBe(true);
  });

  it("replaces stale deterministic findings with validation of the current candidate", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.entities[0].time = {
      kind: "exact",
      start: null,
      end: null,
      daypart: null,
      raw_text: "10:30",
      crosses_midnight: false,
    };
    const parserFindings = [
      {
        blocking: true,
        code: "TIME_SHAPE_INVALID",
        message: "Parser snapshot of an invalid exact time.",
        entity_refs: [draft.entities[0].id],
      },
      {
        blocking: true,
        code: "AMBIGUOUS_BOOKING_REFERENCE",
        message: "This ambiguity still needs an explicit resolution.",
        entity_refs: [draft.entities[0].id],
      },
    ];

    expect(
      deriveReviewFindings(draft, parserFindings).map(
        (finding) => finding.code,
      ),
    ).toEqual(
      expect.arrayContaining([
        "TIME_SHAPE_INVALID",
        "AMBIGUOUS_BOOKING_REFERENCE",
      ]),
    );

    const corrected = editReviewEntity(
      draft,
      draft.entities[0].id,
      "time.start",
      (entity) => {
        entity.time.start = "10:30";
      },
    );
    const correctedFindings = deriveReviewFindings(corrected, parserFindings);

    expect(
      correctedFindings.some(
        (finding) => finding.code === "TIME_SHAPE_INVALID",
      ),
    ).toBe(false);
    expect(
      correctedFindings.find(
        (finding) => finding.code === "AMBIGUOUS_BOOKING_REFERENCE",
      ),
    ).toMatchObject({ blocking: true });
  });

  it("converts coverage gaps through the shared review finding boundary", () => {
    expect(
      deriveUnparsedItemFindings([
        {
          source_ref: "source-block:001",
          locator: "lines 1-1",
          reason_code: "ambiguous_note",
          severity: "warning",
          message: "The note remains ambiguous.",
        },
        {
          source_ref: "source-block:002",
          locator: "lines 2-2",
          reason_code: "missing_structure",
          severity: "error",
          message: "Structure is missing.",
        },
      ]),
    ).toEqual([
      {
        blocking: false,
        code: "ambiguous_note",
        message: "The note remains ambiguous.",
        severity: "warning",
        source_refs: ["source-block:001"],
      },
      {
        blocking: true,
        code: "missing_structure",
        message: "Structure is missing.",
        severity: "error",
        source_refs: ["source-block:002"],
      },
    ]);
  });

  it("constrains user provenance to supported review field paths", () => {
    expectTypeOf<
      Parameters<typeof editReviewEntity>[2]
    >().toEqualTypeOf<ReviewEntityFieldPath>();
    expectTypeOf<"time.start">().toExtend<ReviewEntityFieldPath>();
    expectTypeOf<"time.strat">().not.toExtend<ReviewEntityFieldPath>();
  });

  it("stores an explicit session candidate audit record for one parser-specific resolution", () => {
    const finding = {
      blocking: true,
      code: "AMBIGUOUS_BOOKING_REFERENCE",
      message: "Choose which booking reference applies.",
      entity_refs: [validParsedTripDraft.entities[0].id],
      source_refs: ["source-block:001"],
    };

    const resolved = resolveReviewFinding(validParsedTripDraft, finding);
    const findings = deriveReviewFindings(resolved, [finding]);

    expect(findings).not.toContainEqual(expect.objectContaining(finding));
    expect(findings).toContainEqual(
      expect.objectContaining({
        blocking: false,
        code: "USER_RESOLVED_FINDING",
        entity_refs: [validParsedTripDraft.entities[0].id],
        source_refs: ["source-block:001"],
      }),
    );
    expect(validParsedTripDraft.findings).toEqual([]);
  });

  it("cannot acknowledge a mechanically detectable unsupported clock while it remains unchanged", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.entities[0]!.time = {
      kind: "exact",
      start: "06:30",
      end: null,
      daypart: null,
      raw_text: "6:30",
      crosses_midnight: false,
    };
    const finding = {
      id: "finding:local-fidelity:ambiguous_clock_precision_inferred:test",
      blocking: true,
      code: "AMBIGUOUS_CLOCK_PRECISION_INFERRED",
      message: "6:30 has no supported meridiem.",
      entity_refs: [draft.entities[0]!.id],
      source_refs: ["source-block:001"],
    };

    const acknowledged = resolveReviewFinding(draft, finding);

    expect(acknowledged).toEqual(draft);
    expect(deriveReviewFindings(acknowledged, [finding])).toContainEqual(
      expect.objectContaining({
        code: "AMBIGUOUS_CLOCK_PRECISION_INFERRED",
        blocking: true,
      }),
    );
    expect(
      acknowledged.findings.some(
        (candidate) => candidate.code === "USER_RESOLVED_FINDING",
      ),
    ).toBe(false);
  });

  it("resolves parser-specific blockers independently", () => {
    const first = {
      blocking: true,
      code: "AMBIGUOUS_BOOKING_REFERENCE",
      message: "Choose which booking reference applies.",
      source_refs: ["source-block:001"],
    };
    const second = {
      blocking: true,
      code: "AMBIGUOUS_PLACE",
      message: "Choose which place applies.",
      source_refs: ["source-block:001"],
    };

    const resolved = resolveReviewFinding(validParsedTripDraft, first);
    const findings = deriveReviewFindings(resolved, [first, second]);

    expect(findings.some((finding) => finding.code === first.code)).toBe(false);
    expect(
      findings.find((finding) => finding.code === second.code),
    ).toMatchObject({ blocking: true });
    expect(
      findings.filter((finding) => finding.code === "USER_RESOLVED_FINDING"),
    ).toHaveLength(1);
  });

  it("uses the parser finding id to distinguish otherwise identical blockers", () => {
    const shared = {
      blocking: true,
      code: "AMBIGUOUS_BOOKING_REFERENCE",
      message: "Choose which booking reference applies.",
      source_refs: ["source-block:001"],
    };
    const first = { ...shared, id: "finding:booking:first" };
    const second = { ...shared, id: "finding:booking:second" };

    const resolved = resolveReviewFinding(validParsedTripDraft, first);
    const findings = deriveReviewFindings(resolved, [first, second]);

    expect(findings.some((finding) => finding.id === first.id)).toBe(false);
    expect(findings.find((finding) => finding.id === second.id)).toMatchObject({
      blocking: true,
      code: "AMBIGUOUS_BOOKING_REFERENCE",
    });
    expect(
      findings.filter((finding) => finding.code === "USER_RESOLVED_FINDING"),
    ).toHaveLength(1);
  });
});
