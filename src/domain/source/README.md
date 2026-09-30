# Source domain ownership

Own the source-neutral `UnifiedSourceDocument` contract, its executable schema,
the deterministic pre-interpretation gate, and the coverage expectation derived
from evidence-unit identity. No React, adapter, or provider dependencies.

## Boundary

- `schemas/unified-source-document.v1.schema.json` is authoritative. `types.ts`
  is its TypeScript projection, not a second contract.
- `ValidatedUnifiedSourceDocument` is branded and unforgeable outside this
  module. `validateUnifiedSourceDocument` is the only way to obtain one, so an
  adapter cannot hand an unvalidated document to the interpretation interface.
- The gate runs the schema first and returns `schema_invalid` alone; the
  deterministic checks (source-ID agreement, unique evidence IDs, dense
  ascending source order, parent/header/finding references, hierarchy cycles)
  only run on a schema-valid document.
- Locator presence is a schema rule. The gate additionally requires an
  extraction finding to report the same locator as the evidence unit it
  references, so Review is never sent to the wrong place in the source.
- Byte/token preflight is not owned here. It belongs to the interpretation
  request path immediately before provider invocation.

## Evidence variants

Markdown V0 emits only `markdown_block`. The `tabular_region` variant is
dormant: it fixes the seam Spreadsheet V0.2 will consume, and declaring it here
neither enables XLSX/XLS/CSV intake nor claims spreadsheet acceptance.

## Naming debt

`sourceCoverage.ts` is the single place that maps `evidence_unit_ids` onto the
`block_ids` / `block_dispositions` names still serialized by
`SemanticInterpretationResult`. Those names are frozen by the External Markdown
Benchmark #001 fixtures; rename both sides together in a later change that can
afford a new live benchmark acceptance run.
