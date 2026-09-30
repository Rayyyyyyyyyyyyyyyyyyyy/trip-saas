import { describe, expect, it } from "vitest";
import {
  buildCanonicalTrip,
  validateCanonicalTripAuthoritatively,
} from "../../src/domain/trip/buildCanonicalTrip";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

describe("reviewed candidate CanonicalTrip builder", () => {
  it("builds and validates only the allowlisted canonical shape", () => {
    const draft = structuredClone(validParsedTripDraft);
    draft.entities[0].provenance = {
      origin: "user",
      overridden_fields: ["title"],
    };
    draft.entities[0].actions = [
      {
        id: "action:map",
        kind: "map",
        label: "Directions",
        url: "https://maps.example.test/place",
      },
    ];

    const canonical = buildCanonicalTrip(draft);

    expect(validateCanonicalTripAuthoritatively(canonical).valid).toBe(true);
    expect(canonical.entities[0].provenance).toEqual({
      origin: "user",
      overridden_fields: ["title"],
      source_id: null,
      locator_refs: [],
    });
    expect(JSON.stringify(canonical)).not.toContain("source_refs");
    expect(JSON.stringify(canonical)).not.toContain("confidence");
    expect(JSON.stringify(canonical)).not.toContain("findings");
  });

  it("maps interpreter provenance to durable source provenance", () => {
    expect(
      buildCanonicalTrip(validParsedTripDraft, {
        sourceId: "source:fixture-001",
      }).entities[0].provenance,
    ).toEqual({
      origin: "source",
      overridden_fields: [],
      source_id: "source:fixture-001",
      locator_refs: ["source-block:001"],
    });
  });

  it("does not fabricate source trace when legacy context is unavailable", () => {
    expect(buildCanonicalTrip(validParsedTripDraft).entities[0].provenance).toEqual({
      origin: "legacy_unavailable",
      overridden_fields: [],
      source_id: null,
      locator_refs: [],
    });
  });

  it("rejects broken canonical references", () => {
    const canonical = buildCanonicalTrip(validParsedTripDraft);
    canonical.entities[0].day_id = "day:missing";

    expect(
      validateCanonicalTripAuthoritatively(canonical).findings.map(
        (item) => item.code,
      ),
    ).toContain("UNKNOWN_DAY_REFERENCE");
  });
});
