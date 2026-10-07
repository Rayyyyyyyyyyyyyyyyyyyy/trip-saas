import type {
  BlockDisposition,
  Coverage,
  SourceExpectation,
  TripFinding,
} from "../trip/types";
import type { ValidatedUnifiedSourceDocument } from "./types";

/**
 * Coverage is expressed through source-neutral evidence-unit identity, so a
 * later tabular adapter can use cells or regions without changing the
 * interpretation contract.
 *
 * Naming debt: `SemanticInterpretationResult` still serializes this set as
 * `coverage.block_ids` / `coverage.block_dispositions`. Those names are frozen
 * by the External Markdown Benchmark #001 fixtures, so this is the single
 * function that maps `evidence_unit_ids` onto them. Result v2 adds optional
 * range compression; downstream gates still consume individual dispositions.
 */

export function evidenceUnitIds(
  document: ValidatedUnifiedSourceDocument,
): string[] {
  return document.evidence_units.map((unit) => unit.id);
}

export function sourceExpectationFor(
  document: ValidatedUnifiedSourceDocument,
): SourceExpectation {
  return {
    source_id: document.source_id,
    schema_version: document.schema_version,
    block_ids: evidenceUnitIds(document),
  };
}

/** Strict response-schema validation precedes this bounded source-order expansion. */
export function expandSourceCoverage(
  coverage: Coverage,
  expectedIds: readonly string[],
):
  | { valid: true; coverage: Coverage }
  | { valid: false; findings: TripFinding[] } {
  const { block_disposition_ranges: ranges, ...individualCoverage } = coverage;
  if (!ranges?.length) {
    return { valid: true, coverage: structuredClone(individualCoverage) };
  }
  const failure = (code: string, message: string) => ({
    valid: false as const,
    findings: [{ code, message, blocking: true }],
  });
  const positions = new Map(expectedIds.map((id, index) => [id, index]));
  const dispositions = new Map<string, BlockDisposition>();
  const add = (
    source_ref: string,
    disposition: BlockDisposition["disposition"],
  ) => {
    if (!positions.has(source_ref))
      return failure(
        "UNKNOWN_BLOCK_DISPOSITION",
        "Coverage references an unknown evidence unit.",
      );
    if (dispositions.has(source_ref))
      return failure(
        "DUPLICATE_BLOCK_DISPOSITION",
        "Coverage dispositions overlap.",
      );
    dispositions.set(source_ref, { source_ref, disposition });
    return null;
  };
  for (const item of coverage.block_dispositions) {
    const invalid = add(item.source_ref, item.disposition);
    if (invalid) return invalid;
  }
  for (const range of ranges) {
    const from = positions.get(range.from_id);
    const to = positions.get(range.to_id);
    if (from === undefined || to === undefined)
      return failure(
        "UNKNOWN_COVERAGE_RANGE_ENDPOINT",
        "Coverage range endpoint is outside the source document.",
      );
    if (from > to)
      return failure(
        "REVERSED_COVERAGE_RANGE",
        "Coverage range endpoints are reversed in source order.",
      );
    for (let index = from; index <= to; index++) {
      const invalid = add(expectedIds[index]!, range.disposition);
      if (invalid) return invalid;
    }
  }
  if (dispositions.size !== expectedIds.length)
    return failure(
      "MISSING_BLOCK_DISPOSITION",
      "Coverage ranges and individual dispositions leave a gap.",
    );
  return {
    valid: true,
    coverage: {
      ...structuredClone(individualCoverage),
      block_dispositions: expectedIds.map((id) => dispositions.get(id)!),
    },
  };
}
