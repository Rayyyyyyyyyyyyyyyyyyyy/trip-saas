# Source domain ownership

Own the source-neutral `UnifiedSourceDocument` contract, its executable schema,
the deterministic pre-interpretation gate, and the coverage expectation derived
from evidence-unit identity. No React, adapter, or provider dependencies.

`expandSourceCoverage` expands optional result-v2 ranges in validated document
order after response-schema validation, rejecting unknown/reversed endpoints,
gaps and overlaps. It creates a fresh individual-only coverage object; expansion
cannot exceed the expected source-unit count. Review and scoring receive the
expanded result, while historical provider artifacts remain untouched.

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

Markdown V0 emits only `markdown_block`. The `tabular_region` variant now has
deterministic sheet identity/order, row-major coordinate, merge and header
checks. Auxiliary typed hints remain separate from display text, and optional
`excluded_sheets` records selected scope. These source contracts do not enable
Home spreadsheet entry or establish live spreadsheet acceptance.

Complete tabular locators match `sheet:<verbatim name>!<A1 range>`. Only explicit
covered-cell children may overlap their own enclosing merge anchor; every such
child retains its own evidence identity and a hidden-content warning. Source
format/evidence-kind agreement prevents a relabeled document bypassing checks.

`assessTabularDateSupport` compares proposed Trip/Day years against their own
cited visible display text. Its non-blocking findings stay schema-compatible;
bounded typed date decisions are a separate memory-only projection for the
closed Review adjustment. Raw serials, typed hints and covered hidden content
cannot establish a year. This necessary check is not full semantic acceptance.

`chunkSourceBySheet` preserves source/evidence identity and physical structure,
rebasing only chunk-local evidence order. The interpreter validates each chunk
and preflights actual transport budgets before sending any request. Reconciliation
and global response validation own complete coverage and a single Review draft.

The pre-provider gate also enforces bounded serialized source bytes and evidence
counts using `sourceDocumentLimits`. Provider request budgets are independent.

## Naming debt

`sourceCoverage.ts` is the single place that maps `evidence_unit_ids` onto the
`block_ids` / `block_dispositions` names still serialized by
`SemanticInterpretationResult`. Those names are frozen by the External Markdown
Benchmark #001 fixtures; rename both sides together in a later change that can
afford a new live benchmark acceptance run.
