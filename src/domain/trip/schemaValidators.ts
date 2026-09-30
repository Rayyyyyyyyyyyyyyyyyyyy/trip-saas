import type { ErrorObject, ValidateFunction } from "ajv";
import {
  canonicalTripV1Validator,
  canonicalTripValidator,
  parsedTripDraftValidator,
  semanticInterpretationResultValidator,
  textSourceInputValidator,
} from "../generated/schemaValidators.generated.js";

interface SchemaValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

function validationResult(
  validator: ValidateFunction | undefined,
  value: unknown,
): SchemaValidationResult {
  if (!validator)
    throw new Error("Required JSON Schema validator is unavailable.");
  const valid = validator(value);
  return {
    valid,
    errors: valid ? [] : structuredClone(validator.errors ?? []),
  };
}

export const validateTextSourceInputSchema = (value: unknown) =>
  validationResult(textSourceInputValidator, value);
export const validateParsedTripDraftSchema = (value: unknown) =>
  validationResult(parsedTripDraftValidator, value);
export const validateSemanticInterpretationResultSchema = (value: unknown) =>
  validationResult(semanticInterpretationResultValidator, value);
export const validateCanonicalTripSchema = (value: unknown) =>
  validationResult(canonicalTripValidator, value);
export const validateCanonicalTripV1Schema = (value: unknown) =>
  validationResult(canonicalTripV1Validator, value);
