import { validateCanonicalTripSchema } from "./schemaValidators";
import { validateInterpretationResponse } from "./validateInterpretationResponse";
import { validateParsedTripDraft } from "./validateParsedTripDraft";
import { validateTripSemantics } from "./validateTripSemantics";
import type {
  CanonicalTrip,
  SemanticInterpretationResult,
  SourceExpectation,
  TripFinding,
} from "./types";

const gateFinding = (code: string, message: string): TripFinding => ({
  code,
  message,
  refs: [],
  blocking: true,
});

export function evaluateGateA(
  result: SemanticInterpretationResult,
  expectedSource: SourceExpectation,
) {
  const validation = validateInterpretationResponse(result, expectedSource);
  return { pass: validation.valid, findings: validation.findings };
}

export function evaluateReviewableDraft(
  result: SemanticInterpretationResult,
  expectedSource: SourceExpectation,
) {
  const gateA = evaluateGateA(result, expectedSource);
  if (!gateA.pass) return gateA;
  if (result.status !== "draft" || result.draft === null) {
    return {
      pass: false,
      findings: [
        gateFinding(
          "REVIEWABLE_DRAFT_UNAVAILABLE",
          "Interpretation is insufficient for normal Review.",
        ),
      ],
    };
  }

  const draftValidation = validateParsedTripDraft(
    result.draft,
    expectedSource.block_ids,
  );
  const findings = [...draftValidation.findings];

  return { pass: findings.length === 0, findings };
}

export function evaluateRenderableConfirmedResult({
  canonicalTrip,
  userConfirmed,
  persistenceCommitted,
}: {
  canonicalTrip: CanonicalTrip;
  userConfirmed: boolean;
  persistenceCommitted: boolean;
}) {
  const findings: TripFinding[] = [];
  const schemaResult = validateCanonicalTripSchema(canonicalTrip);
  if (!schemaResult.valid) {
    findings.push(
      gateFinding("CANONICAL_SCHEMA_INVALID", "CanonicalTrip is invalid."),
    );
  } else {
    findings.push(...validateTripSemantics(canonicalTrip));
  }
  if (!userConfirmed) {
    findings.push(
      gateFinding(
        "USER_CONFIRMATION_MISSING",
        "User confirmation is required.",
      ),
    );
  }
  if (!persistenceCommitted) {
    findings.push(
      gateFinding(
        "PERSISTENCE_NOT_COMMITTED",
        "Persistence must commit before success.",
      ),
    );
  }
  return { pass: findings.length === 0, findings };
}
