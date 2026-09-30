import { describe, expect, it } from "vitest";
import { validateParsedTripDraft } from "../../src/domain/trip/validateParsedTripDraft";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";
import type { ParsedTripDraft } from "../../src/domain/trip/types";

const validate = (draft: ParsedTripDraft) =>
  validateParsedTripDraft(draft, ["source-block:001"]);

describe("deterministic ParsedTripDraft validation", () => {
  it("accepts valid IDs, references, dates, and untimed intent", () => {
    expect(validate(validParsedTripDraft)).toEqual({
      valid: true,
      findings: [],
      schemaErrors: [],
    });
  });

  it("reports duplicate IDs and unknown day/source references", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.entities[0].id = draft.days[0].id;
    draft.entities[0].day_id = "day:unknown";
    draft.entities[0].source_refs = ["source-block:unknown"];

    const codes = validate(draft).findings.map((finding) => finding.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "DUPLICATE_ID",
        "UNKNOWN_DAY_REFERENCE",
        "UNKNOWN_SOURCE_REFERENCE",
      ]),
    );
  });

  it("reports invalid calendar dates and trip-range conflicts", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.trip.start_date = "2026-09-11";
    draft.trip.end_date = "2026-09-10";
    draft.days[0].date = "2026-02-31";

    const codes = validate(draft).findings.map((finding) => finding.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "TRIP_RANGE_REVERSED",
        "DAY_DATE_INVALID",
        "DAY_OUTSIDE_TRIP_RANGE",
      ]),
    );
  });

  it.each([
    ["exact", { start: null, end: null }, "TIME_SHAPE_INVALID"],
    ["open_ended", { start: "18:30", end: "19:00" }, "TIME_SHAPE_INVALID"],
    ["range", { start: "20:00", end: "19:00" }, "TIME_RANGE_REVERSED"],
  ])("reports inconsistent %s time", (kind, patch, expectedCode) => {
    const draft = structuredClone(validParsedTripDraft);
    Object.assign(draft.entities[0].time, { kind, ...patch });

    expect(validate(draft).findings.map((finding) => finding.code)).toContain(
      expectedCode,
    );
  });
});
