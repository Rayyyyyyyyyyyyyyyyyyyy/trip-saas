import type { ErrorObject } from "ajv";
import { unifiedSourceDocumentValidator } from "../generated/schemaValidators.generated.js";

export interface SourceSchemaValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

export function validateUnifiedSourceDocumentSchema(
  value: unknown,
): SourceSchemaValidationResult {
  const valid = unifiedSourceDocumentValidator(value);
  return {
    valid,
    errors: valid
      ? []
      : structuredClone(unifiedSourceDocumentValidator.errors ?? []),
  };
}
