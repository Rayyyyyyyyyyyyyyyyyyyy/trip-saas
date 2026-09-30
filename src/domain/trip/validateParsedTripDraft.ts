import { validateParsedTripDraftSchema } from "./schemaValidators";
import type { ParsedTripDraft, TripFinding, ValidationResult } from "./types";
import { validateTripSemantics } from "./validateTripSemantics";

const issue = (
  code: string,
  message: string,
  refs: string[] = [],
): TripFinding => ({
  code,
  message,
  refs,
  blocking: true,
});

export function validateParsedTripDraft(
  draft: ParsedTripDraft,
  expectedSourceRefs: string[] = [],
): ValidationResult {
  const schemaResult = validateParsedTripDraftSchema(draft);
  if (!schemaResult.valid) {
    return {
      valid: false,
      findings: [issue("SCHEMA_INVALID", "ParsedTripDraft schema is invalid.")],
      schemaErrors: schemaResult.errors,
    };
  }

  const findings: TripFinding[] = validateTripSemantics(draft);

  if (expectedSourceRefs.length > 0) {
    const allowed = new Set(expectedSourceRefs);
    const sourceOwners = [
      draft.trip,
      ...draft.days,
      ...draft.entities,
      ...draft.relationships,
      ...draft.supporting_items,
      ...draft.findings,
    ];
    for (const owner of sourceOwners) {
      for (const sourceRef of owner.source_refs) {
        if (!allowed.has(sourceRef)) {
          findings.push(
            issue(
              "UNKNOWN_SOURCE_REFERENCE",
              `Unknown source reference: ${sourceRef}`,
              [owner.id],
            ),
          );
        }
      }
    }
  }

  return { valid: findings.length === 0, findings, schemaErrors: [] };
}
