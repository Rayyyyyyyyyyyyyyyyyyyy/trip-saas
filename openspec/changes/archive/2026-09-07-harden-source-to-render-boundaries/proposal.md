## Why

The current Markdown V0 pipeline has the correct Source → Interpretation → Review → Canonical → Presentation direction, but the code does not yet enforce a runtime-valid `UnifiedSourceDocument` before Gemini and its nominally source-neutral contract is owned by the Markdown adapter. The same workflow and presentation gaps would multiply when XLSX/CSV arrives, so the seams need to be hardened before adding another source format.

## What Changes

- Add an executable, versioned `UnifiedSourceDocument` contract and a deterministic pre-interpretation gate that rejects invalid source identity, evidence units, locators, ordering, references, and unsafe request size before any provider call.
- Move the source-neutral document/evidence interface out of the Markdown feature. Markdown remains one Source Adapter; future spreadsheet adapters can preserve their own structural evidence without changing interpretation, Review, CanonicalTrip, or Result interfaces.
- Add a source-neutral Review evidence projection so Markdown excerpts and later spreadsheet cell/range evidence use the same Review flow without exposing source objects to Review components.
- Consolidate import, interpretation, validation, failure, cancellation, and candidate progress under one application workflow owner. Intake controls retain only unsubmitted file/paste form state.
- Add an application-level processing deadline and an explicit stop action to the blocking interpretation modal so reading, extraction, provider, and validation work cannot leave the interface indefinitely locked. Timeout, cancellation, and late completion preserve the selected source and current confirmed trip.
- Establish one deep interpretation module that owns input validation, provider invocation, provider-output validation, coverage checks, and the Reviewable Draft gate. Provider adapters remain responsible only for provider transport and provider-specific envelopes.
- Select the exact stable model ID `gemini-3.5-flash` as the V0 default candidate. It becomes the production default only after its structured-output fixtures and live External Markdown Benchmark #001 pass; this change does not add automatic model fallback.
- Change Presentation Projection to emit an ordered, non-overlapping Day display tree. Each canonical entity has exactly one primary placement per Day; summaries may reference an entity without rendering a second full copy.
- Route the bundled Golden sample by explicit sample state/capability rather than by CanonicalTrip ID. Persisted confirmed trips always render the supplied CanonicalTrip.
- Preserve the current Markdown V0 behavior, active-trip transaction safety, fixed source-agnostic UI grammar, and production-model benchmark gate while changing the candidate named by that gate to `gemini-3.5-flash`.
- Preserve the already verified provider timeout, bounded retry, safe failure translation, malformed-output rejection, modal release, selected-source retry, and active-trip protection while adding the missing application-level deadlines and explicit stop path.
- Keep XLSX/XLS/CSV extraction itself outside this change; this change prepares the validated seam that the gated Spreadsheet V0.2 adapter will later consume.

## Capabilities

### New Capabilities

- `validated-source-document`: Defines the executable source-neutral `UnifiedSourceDocument`, deterministic pre-LLM validation, source evidence identities, and source-neutral Review evidence projection.
- `trip-interpretation-workflow`: Defines the single workflow owner and deep interpretation interface spanning source readiness, provider execution, output gates, bounded modal lifetime, explicit cancellation, failure recovery, benchmark-gated default-model selection, and explicit sample routing.
- `deterministic-result-placement`: Defines the fixed Presentation Projection display tree, unique primary entity placement, complete relationship rendering, and source-agnostic Result consumption.

### Modified Capabilities

None. The repository has no archived baseline capabilities under `openspec/specs/`; this change introduces focused cross-cutting contracts that refine the still-active V0 implementation without expanding its source-format scope.

## Impact

- Affects `src/domain`, `src/app`, `src/features/import`, `src/features/review`, `src/features/result`, and `src/integrations/gemini` ownership and imports.
- Adds a versioned JSON Schema and validator fixtures for `UnifiedSourceDocument` plus architecture tests for dependency direction and source-neutrality.
- Changes internal TypeScript interfaces for prepared sources, interpretation results, Review evidence, workflow events/selectors, and Day presentation items.
- Requires migration of existing Markdown fixtures/tests to the validated source-document interface without changing confirmed CanonicalTrip persistence.
- Requires focused regression coverage for malformed pre-provider input, permanently pending stages, application/provider timeout, explicit modal cancellation, stale/cancelled workflow runs, relationship rendering without duplication, Golden sample routing, and the existing External Markdown Benchmark #001 guardrails.
- Starts from a verified failure-recovery baseline: focused unit/component tests and mobile/desktop browser tests currently pass for provider timeout and malformed-response recovery, but no current evidence proves every non-provider stage is bounded and no live `gemini-3.5-flash` benchmark has been run without an explicitly supplied key.
- Changes the planned production model default from an environment-only/unaccepted candidate to exact `gemini-3.5-flash`, but activates that default only after the required model-specific acceptance gate passes.
- Adds no new runtime dependency, provider, source format, hosted delivery, or persistent data migration.
