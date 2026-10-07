import { validateUnifiedSourceDocumentSchema } from "./schemaValidators";
import {
  MAX_SOURCE_DOCUMENT_BYTES,
  MAX_SOURCE_EVIDENCE_UNITS,
} from "./sourceDocumentLimits";
import { tabularEvidenceIsValid } from "./validateTabularEvidence";
import type {
  SourceEvidenceUnit,
  UnifiedSourceDocument,
  ValidatedUnifiedSourceDocument,
} from "./types";

/**
 * The pre-interpretation gate. It runs the executable schema first, then the
 * deterministic integrity checks the schema cannot express. Only a document
 * that clears both becomes a `ValidatedUnifiedSourceDocument`, so no adapter
 * output can reach a provider request unvalidated.
 */

export type SourceDocumentFailureCode =
  | "schema_invalid"
  | "source_id_mismatch"
  | "duplicate_evidence_id"
  | "invalid_source_order"
  | "invalid_reference"
  | "invalid_tabular_evidence"
  | "source_size_exceeded"
  | "hierarchy_cycle";

export type SourceDocumentFailure = {
  code: SourceDocumentFailureCode;
  message: string;
};

export type SourceDocumentValidationResult =
  | { valid: true; document: ValidatedUnifiedSourceDocument }
  | { valid: false; failures: SourceDocumentFailure[] };

export type SourceDocumentExpectation = {
  source_id: string;
  maxEvidenceUnits?: number;
  maxDocumentBytes?: number;
};

const failure = (
  code: SourceDocumentFailureCode,
  message: string,
): SourceDocumentFailure => ({ code, message });

function checkEvidenceIdentity(units: SourceEvidenceUnit[]) {
  const failures: SourceDocumentFailure[] = [];
  const seen = new Set<string>();
  for (const unit of units) {
    if (seen.has(unit.id)) {
      failures.push(
        failure("duplicate_evidence_id", `Duplicate evidence unit: ${unit.id}`),
      );
    }
    seen.add(unit.id);
  }
  return failures;
}

// Source order must be the document's own dense, ascending index. A gap or a
// repeat means the adapter lost or reordered evidence, which would silently
// change what interpretation sees.
function checkSourceOrder(units: SourceEvidenceUnit[]) {
  return units.flatMap((unit, index) =>
    unit.source_order === index
      ? []
      : [
          failure(
            "invalid_source_order",
            `Evidence unit ${unit.id} declares source order ${unit.source_order} at position ${index}.`,
          ),
        ],
  );
}

function checkReferences(
  document: UnifiedSourceDocument,
  unitsById: Map<string, SourceEvidenceUnit>,
) {
  const failures: SourceDocumentFailure[] = [];

  for (const unit of document.evidence_units) {
    if (unit.parent_ref !== null && !unitsById.has(unit.parent_ref)) {
      failures.push(
        failure(
          "invalid_reference",
          `Evidence unit ${unit.id} references unknown parent ${unit.parent_ref}.`,
        ),
      );
    }
    for (const evidence of unit.structural_evidence) {
      if (
        evidence.evidence_kind === "tabular_region" &&
        evidence.header_ref !== null &&
        !unitsById.has(evidence.header_ref)
      ) {
        failures.push(
          failure(
            "invalid_reference",
            `Evidence unit ${unit.id} references unknown header ${evidence.header_ref}.`,
          ),
        );
      }
    }
  }

  for (const finding of document.extraction_findings) {
    const referenced = unitsById.get(finding.evidence_unit_ref);
    if (!referenced) {
      failures.push(
        failure(
          "invalid_reference",
          `Extraction finding references unknown evidence unit ${finding.evidence_unit_ref}.`,
        ),
      );
      continue;
    }
    // A finding that reports a different locator than the unit it points at
    // would send Review to the wrong place in the source.
    if (referenced.locator !== finding.locator) {
      failures.push(
        failure(
          "invalid_reference",
          `Extraction finding locator does not match evidence unit ${referenced.id}.`,
        ),
      );
    }
  }

  return failures;
}

function checkHierarchy(
  units: SourceEvidenceUnit[],
  unitsById: Map<string, SourceEvidenceUnit>,
) {
  const failures: SourceDocumentFailure[] = [];
  for (const unit of units) {
    const visited = new Set<string>([unit.id]);
    let current = unit.parent_ref;
    while (current !== null) {
      if (visited.has(current)) {
        failures.push(
          failure(
            "hierarchy_cycle",
            `Evidence unit ${unit.id} takes part in a parent reference cycle.`,
          ),
        );
        break;
      }
      visited.add(current);
      current = unitsById.get(current)?.parent_ref ?? null;
    }
  }
  return failures;
}

export function validateUnifiedSourceDocument(
  value: unknown,
  expected: SourceDocumentExpectation,
): SourceDocumentValidationResult {
  const schemaResult = validateUnifiedSourceDocumentSchema(value);
  if (!schemaResult.valid) {
    return {
      valid: false,
      failures: [
        failure(
          "schema_invalid",
          "Source document does not satisfy the UnifiedSourceDocument schema.",
        ),
      ],
    };
  }

  const document = value as UnifiedSourceDocument;
  const maxUnits = expected.maxEvidenceUnits ?? MAX_SOURCE_EVIDENCE_UNITS;
  const maxBytes = expected.maxDocumentBytes ?? MAX_SOURCE_DOCUMENT_BYTES;
  if (
    !Number.isFinite(maxUnits) ||
    maxUnits < 1 ||
    !Number.isFinite(maxBytes) ||
    maxBytes < 1 ||
    document.evidence_units.length > maxUnits ||
    new TextEncoder().encode(JSON.stringify(document)).byteLength > maxBytes
  ) {
    return {
      valid: false,
      failures: [
        failure(
          "source_size_exceeded",
          "Source document exceeds the configured evidence/byte limit.",
        ),
      ],
    };
  }
  const unitsById = new Map(
    document.evidence_units.map((unit) => [unit.id, unit]),
  );
  const failures: SourceDocumentFailure[] = [];

  if (document.source_id !== expected.source_id) {
    failures.push(
      failure(
        "source_id_mismatch",
        "Source document identity does not match the submitted source.",
      ),
    );
  }
  failures.push(...checkEvidenceIdentity(document.evidence_units));
  failures.push(...checkSourceOrder(document.evidence_units));
  failures.push(...checkReferences(document, unitsById));
  failures.push(...checkHierarchy(document.evidence_units, unitsById));
  const formatMatchesEvidence = document.evidence_units.every((unit) =>
    unit.structural_evidence.every((evidence) =>
      document.source_format === "tabular"
        ? evidence.evidence_kind === "tabular_region"
        : evidence.evidence_kind === "markdown_block",
    ),
  );
  if (
    !formatMatchesEvidence ||
    (document.source_format === "tabular" && !tabularEvidenceIsValid(document))
  ) {
    failures.push(
      failure(
        "invalid_tabular_evidence",
        "Source format or tabular sheet, coordinate, merge or header structure is inconsistent.",
      ),
    );
  }

  if (failures.length > 0) {
    return { valid: false, failures };
  }
  return {
    valid: true,
    document: document as ValidatedUnifiedSourceDocument,
  };
}
