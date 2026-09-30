import type { SourceExpectation } from "../trip/types";
import type { ValidatedUnifiedSourceDocument } from "./types";

/**
 * Coverage is expressed through source-neutral evidence-unit identity, so a
 * later tabular adapter can use cells or regions without changing the
 * interpretation contract.
 *
 * Naming debt: `SemanticInterpretationResult` still serializes this set as
 * `coverage.block_ids` / `coverage.block_dispositions`. Those names are frozen
 * by the External Markdown Benchmark #001 fixtures, so this is the single
 * function that maps `evidence_unit_ids` onto them. Rename both sides together
 * in a later change that can afford a new live benchmark acceptance run.
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
