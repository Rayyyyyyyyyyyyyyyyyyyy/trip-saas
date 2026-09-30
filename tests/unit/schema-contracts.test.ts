import { describe, expect, it } from "vitest";
import {
  validateCanonicalTripSchema,
  validateParsedTripDraftSchema,
  validateSemanticInterpretationResultSchema,
  validateTextSourceInputSchema,
} from "../../src/domain/trip/schemaValidators";
import {
  validCanonicalTrip,
  validDraftInterpretationResult,
  validInsufficientInterpretationResult,
  validParsedTripDraft,
  validTextSourceInput,
} from "../fixtures/contracts/validContracts";

const clone = <T>(value: T): T => structuredClone(value);

describe("TextSourceInput schema", () => {
  it("accepts the normalized contract", () => {
    expect(validateTextSourceInputSchema(validTextSourceInput)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects missing, unknown, and whitespace-only members", () => {
    const missing = clone(validTextSourceInput) as any;
    delete missing.display_name;
    const unknown = { ...validTextSourceInput, provider: "gemini" };
    const empty = { ...validTextSourceInput, content: "  \n" };

    expect(validateTextSourceInputSchema(missing).valid).toBe(false);
    expect(validateTextSourceInputSchema(unknown).valid).toBe(false);
    expect(validateTextSourceInputSchema(empty).valid).toBe(false);
  });
});

describe("ParsedTripDraft schema", () => {
  it("accepts explicit nullability and required empty lists", () => {
    expect(validateParsedTripDraftSchema(validParsedTripDraft)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects missing members, unknown members, invalid enums, and implicit nulls", () => {
    const missing = clone(validParsedTripDraft) as any;
    delete missing.entities[0].time;
    const unknown = clone(validParsedTripDraft) as any;
    unknown.entities[0].provider_metadata = {};
    const invalidEnum = clone(validParsedTripDraft) as any;
    invalidEnum.entities[0].time.kind = "precise";
    const invalidNull = clone(validParsedTripDraft) as any;
    invalidNull.entities[0].state.optional = null;

    expect(validateParsedTripDraftSchema(missing).valid).toBe(false);
    expect(validateParsedTripDraftSchema(unknown).valid).toBe(false);
    expect(validateParsedTripDraftSchema(invalidEnum).valid).toBe(false);
    expect(validateParsedTripDraftSchema(invalidNull).valid).toBe(false);
  });

  it("rejects malformed stable references", () => {
    const malformedReference = clone(validParsedTripDraft);
    malformedReference.entities[0].day_id = "not a stable ref";

    expect(validateParsedTripDraftSchema(malformedReference).valid).toBe(false);
  });
});

describe("SemanticInterpretationResult discriminator", () => {
  it("accepts draft and insufficient outcomes", () => {
    expect(
      validateSemanticInterpretationResultSchema(validDraftInterpretationResult)
        .valid,
    ).toBe(true);
    expect(
      validateSemanticInterpretationResultSchema(
        validInsufficientInterpretationResult,
      ).valid,
    ).toBe(true);
  });

  it("rejects mismatched status and draft values", () => {
    const draftWithoutDraft = clone(validDraftInterpretationResult);
    draftWithoutDraft.draft = null;
    const insufficientWithDraft = clone(validInsufficientInterpretationResult);
    insufficientWithDraft.draft = validParsedTripDraft;

    expect(
      validateSemanticInterpretationResultSchema(draftWithoutDraft).valid,
    ).toBe(false);
    expect(
      validateSemanticInterpretationResultSchema(insufficientWithDraft).valid,
    ).toBe(false);
  });
});

describe("CanonicalTrip schema", () => {
  it("accepts the strict allowlisted shape", () => {
    expect(validateCanonicalTripSchema(validCanonicalTrip)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects draft/provider fields and invalid nullability", () => {
    const sourceLeak = clone(validCanonicalTrip) as any;
    sourceLeak.entities[0].source_refs = ["source-block:001"];
    const providerLeak = { ...validCanonicalTrip, model: "gemini" };
    const invalidNull = clone(validCanonicalTrip) as any;
    invalidNull.days[0].source_order = null;

    expect(validateCanonicalTripSchema(sourceLeak).valid).toBe(false);
    expect(validateCanonicalTripSchema(providerLeak).valid).toBe(false);
    expect(validateCanonicalTripSchema(invalidNull).valid).toBe(false);
  });
});
