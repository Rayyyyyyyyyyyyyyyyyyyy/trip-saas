import { projectedLeaves } from "../fixtures/semantics/projectedLeaves";
import { describe, expect, it } from "vitest";
import { validateCanonicalTripAuthoritatively } from "../../src/domain/trip/buildCanonicalTrip";
import { createTripPresentation } from "../../src/features/result/createTripPresentation";
import { timeSemanticCanonicalTrip } from "../fixtures/semantics/timeSemantics";

describe("time and date semantic fixtures", () => {
  it("is a valid multi-day CanonicalTrip fixture", () => {
    expect(
      validateCanonicalTripAuthoritatively(timeSemanticCanonicalTrip),
    ).toMatchObject({
      valid: true,
      findings: [],
      schemaErrors: [],
    });
  });

  it("preserves mixed source notation while presenting normalized precision", () => {
    const presentation = createTripPresentation(timeSemanticCanonicalTrip);
    const firstDay = presentation.days[0];

    expect(
      projectedLeaves(firstDay.items).map((entity) => entity.time.rawText),
    ).toEqual(["11:55", "5.30 頃", "12點", "七點左右"]);
    expect(
      projectedLeaves(firstDay.items).map((entity) => entity.time.label),
    ).toEqual(["11:55", "約 05:30", "12:00", "約 19:00"]);
  });

  it("preserves open-ended and cross-midnight bounds", () => {
    const rangeDay = createTripPresentation(timeSemanticCanonicalTrip).days[1];

    expect(projectedLeaves(rangeDay.items)[0].time).toMatchObject({
      kind: "open_ended",
      label: "18:30 起",
      hasKnownStart: true,
      hasKnownEnd: false,
    });
    expect(projectedLeaves(rangeDay.items)[1].time).toMatchObject({
      kind: "range",
      label: "23:30–翌日 01:00",
      crossesMidnight: true,
    });
  });

  it("does not invent a fixed anchor for daypart or intentionally untimed content", () => {
    const anchorlessDay = createTripPresentation(timeSemanticCanonicalTrip)
      .days[2];

    expect(anchorlessDay.fixedAnchors).toEqual([]);
    expect(
      projectedLeaves(anchorlessDay.items).map((entity) => entity.time.kind),
    ).toEqual(["daypart", "none"]);
    expect(projectedLeaves(anchorlessDay.items)[1]).toMatchObject({
      role: "flexible_space",
      time: { label: null, isUntimed: true },
    });
  });
});
