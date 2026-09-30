import { describe, expect, it } from "vitest";
import {
  evaluateGateA,
  evaluateRenderableConfirmedResult,
  evaluateReviewableDraft,
} from "../../src/domain/trip/evaluateTripGates";
import { goldenOsakaCanonicalTrip } from "../../src/fixtures/golden/osakaCanonicalTrip";
import {
  validDraftInterpretationResult,
  validInsufficientInterpretationResult,
} from "../fixtures/contracts/validContracts";

const expectedSource = {
  source_id: "source:fixture-001",
  schema_version: "unified-source-document.v1",
  block_ids: ["source-block:001"],
};

describe("Trip Runtime gates", () => {
  it("passes Gate A for a schema-valid, coverage-complete response", () => {
    expect(
      evaluateGateA(validDraftInterpretationResult, expectedSource),
    ).toEqual({
      pass: true,
      findings: [],
    });
  });

  it("keeps schema-valid insufficient results out of normal Review", () => {
    const result = evaluateReviewableDraft(
      validInsufficientInterpretationResult,
      expectedSource,
    );

    expect(result.pass).toBe(false);
    expect(result.findings[0].code).toBe("REVIEWABLE_DRAFT_UNAVAILABLE");
  });

  it("allows a meaningful undated-only draft into Review", () => {
    const response = structuredClone(validDraftInterpretationResult);
    response.draft!.days = [];
    response.draft!.entities[0]!.day_id = null;

    expect(evaluateReviewableDraft(response, expectedSource)).toMatchObject({
      pass: true,
      findings: [],
    });
  });

  it("rejects a draft with no meaningful day, entity, or supporting item", () => {
    const response = structuredClone(validDraftInterpretationResult);
    response.draft!.days = [];
    response.draft!.entities = [];
    response.draft!.supporting_items = [];

    expect(
      evaluateReviewableDraft(response, expectedSource).findings.map(
        (item) => item.code,
      ),
    ).toContain("MINIMUM_TRIP_STRUCTURE_MISSING");
  });

  it("passes renderable gate only after confirmation and persistence", () => {
    expect(
      evaluateRenderableConfirmedResult({
        canonicalTrip: goldenOsakaCanonicalTrip,
        userConfirmed: true,
        persistenceCommitted: true,
      }).pass,
    ).toBe(true);

    const blocked = evaluateRenderableConfirmedResult({
      canonicalTrip: goldenOsakaCanonicalTrip,
      userConfirmed: false,
      persistenceCommitted: false,
    });
    expect(blocked.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "USER_CONFIRMATION_MISSING",
        "PERSISTENCE_NOT_COMMITTED",
      ]),
    );
  });

  it("accepts a confirmed undated-only result and rejects an empty result", () => {
    const undated = structuredClone(goldenOsakaCanonicalTrip);
    undated.days = [];
    undated.entities = [{ ...undated.entities[0], day_id: null }];
    undated.relationships = [];
    undated.supporting_items = [];

    expect(
      evaluateRenderableConfirmedResult({
        canonicalTrip: undated,
        userConfirmed: true,
        persistenceCommitted: true,
      }).pass,
    ).toBe(true);

    const empty = {
      ...undated,
      entities: [],
    };
    expect(
      evaluateRenderableConfirmedResult({
        canonicalTrip: empty,
        userConfirmed: true,
        persistenceCommitted: true,
      }).findings.map((item) => item.code),
    ).toContain("MINIMUM_TRIP_STRUCTURE_MISSING");
  });
});
