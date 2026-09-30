import { validateSemanticInterpretationResultSchema } from "./schemaValidators";
import type {
  SemanticInterpretationResult,
  SourceExpectation,
  TripFinding,
  ValidationResult,
} from "./types";

function finding(code: string, message: string): TripFinding {
  return { code, message, blocking: true };
}

export function validateInterpretationResponse(
  result: SemanticInterpretationResult,
  expectedSource: SourceExpectation,
): ValidationResult {
  const schemaResult = validateSemanticInterpretationResultSchema(result);
  if (!schemaResult.valid) {
    return {
      valid: false,
      findings: [
        finding("SCHEMA_INVALID", "Interpretation response schema is invalid."),
      ],
      schemaErrors: schemaResult.errors,
    };
  }

  const findings: TripFinding[] = [];
  if (result.source_id !== expectedSource.source_id) {
    findings.push(
      finding("SOURCE_ID_MISMATCH", "Response source identity does not match."),
    );
  }
  if (result.source_schema_version !== expectedSource.schema_version) {
    findings.push(
      finding(
        "SOURCE_VERSION_MISMATCH",
        "Response source schema version does not match.",
      ),
    );
  }

  const expectedBlockIds = new Set(expectedSource.block_ids);
  const dispositionCounts = new Map<string, number>();
  for (const disposition of result.coverage.block_dispositions) {
    dispositionCounts.set(
      disposition.source_ref,
      (dispositionCounts.get(disposition.source_ref) ?? 0) + 1,
    );
    if (!expectedBlockIds.has(disposition.source_ref)) {
      findings.push(
        finding(
          "UNKNOWN_BLOCK_DISPOSITION",
          `Unknown source block: ${disposition.source_ref}`,
        ),
      );
    }
  }

  for (const blockId of expectedBlockIds) {
    const count = dispositionCounts.get(blockId) ?? 0;
    if (count === 0) {
      findings.push(
        finding(
          "MISSING_BLOCK_DISPOSITION",
          `Missing source block: ${blockId}`,
        ),
      );
    } else if (count > 1) {
      findings.push(
        finding(
          "DUPLICATE_BLOCK_DISPOSITION",
          `Duplicate source block: ${blockId}`,
        ),
      );
    }
  }

  if (
    result.coverage.total_blocks !== expectedBlockIds.size ||
    result.coverage.total_blocks !== dispositionCounts.size
  ) {
    findings.push(
      finding(
        "COVERAGE_TOTAL_MISMATCH",
        "Coverage total does not match unique source blocks.",
      ),
    );
  }

  const unparsedDispositionIds = new Set(
    result.coverage.block_dispositions
      .filter((item) => item.disposition === "unparsed")
      .map((item) => item.source_ref),
  );
  const unparsedItemCounts = new Map<string, number>();
  for (const item of result.coverage.unparsed_items) {
    unparsedItemCounts.set(
      item.source_ref,
      (unparsedItemCounts.get(item.source_ref) ?? 0) + 1,
    );
    if (!unparsedDispositionIds.has(item.source_ref)) {
      findings.push(
        finding(
          "UNEXPECTED_UNPARSED_ITEM",
          `Unparsed item has no disposition: ${item.source_ref}`,
        ),
      );
    }
  }
  for (const blockId of unparsedDispositionIds) {
    if (unparsedItemCounts.get(blockId) !== 1) {
      findings.push(
        finding(
          "UNPARSED_ITEM_INCOMPLETE",
          `Unparsed block requires one item: ${blockId}`,
        ),
      );
    }
  }

  return { valid: findings.length === 0, findings, schemaErrors: [] };
}
