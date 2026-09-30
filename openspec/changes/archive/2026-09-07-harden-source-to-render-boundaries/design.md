## Context

The current application proves the complete Markdown V0 path, but several interfaces are narrower than the architecture they represent. `UnifiedSourceDocument` is a TypeScript type inside the Markdown adapter, it is serialized into the Gemini prompt without an executable input schema, Review reads Markdown blocks directly, and application progress is split between the import hook and the application workflow reducer. The blocking processing modal is non-dismissible and currently depends primarily on the provider request deadline, so a stalled non-provider stage or state-ownership mismatch can still appear indefinitely locked. On the output side, Presentation Projection exposes overlapping arrays, so one entity can be rendered once in the timeline and again inside a relationship group.

These issues are survivable while Markdown is the only input, but they put source-specific knowledge on both sides of the intended Source Adapter seam. Spreadsheet V0.2 would then require changes in the App, Gemini, Review, and Result layers and could silently send malformed extracted structures to the provider. This design hardens the existing V0 without enabling a new source format or changing persisted CanonicalTrip.

The governing constraints remain:

```text
Code extracts.
LLM understands.
Code verifies.
User confirms.
Renderer presents.
```

Raw sources, source documents, provider responses, and Review state remain session-only. The currently confirmed trip remains readable until a replacement confirmation commits. The Golden Osaka viewer remains a safe explicit sample and real-use fallback.

## Current Implementation Evidence Baseline

This change starts from a partially hardened implementation, not from a wholly
unbounded Gemini flow. The 2026-09-04 evidence review established the following
baseline that implementation must preserve or deliberately replace:

- The Gemini adapter already applies a per-attempt request/body-read deadline
  (120 seconds by default), propagates cancellation, bounds `429` retries, maps
  provider/transport failures to safe codes, parses the structured JSON value,
  and rejects schema-invalid, coverage-invalid, or non-reviewable output before
  Review.
- The application already converts a returned parser failure into a terminal
  workflow failure. Existing unit, component, and mobile/desktop browser tests
  prove that provider timeout and malformed interpretation paths release the
  blocking modal, preserve the selected source for retry, and do not replace the
  current confirmed trip.
- The current modal disables accidental Escape dismissal but exposes no visible
  `停止這次判讀` action. Provider timeout therefore prevents one known infinite
  request wait, but it is not an adequate user-controlled fallback.
- The application has no stage/overall watchdog covering source reading,
  extraction, source-document construction, credential loading, or local
  validation. Those paths have not been reproduced as indefinitely pending;
  their unbounded lifetime is a demonstrated ownership/coverage gap rather than
  a claimed production incident.
- Processing status and failure are split between `useMarkdownIntake` and the
  application workflow, with callback-synchronized progress. Session/request
  identity already rejects some stale provider events, but the workflow is not
  yet the sole owner of every modal-producing stage.
- `UnifiedSourceDocument` remains a TypeScript type owned by the Markdown
  adapter and is serialized to Gemini without the proposed executable
  source-document schema/integrity gate.
- Presentation Projection still emits overlapping `timeline`, `optional`, and
  `relationshipGroups` collections, so unique primary placement is not yet an
  enforced Result contract.
- Production has no no-override Gemini default: the composition root requires
  `VITE_GEMINI_MODEL`. The parser acceptance constant and the existing live
  benchmark runner still name `gemini-3.7-flash`; exact
  `gemini-3.5-flash` is a selected replacement candidate only, pending the
  generated-schema, deterministic, and key-backed live benchmark gates.

The verified user path remains:

```text
Markdown
→ structure-preserving extraction
→ Gemini structured response
→ local response / coverage / Reviewable Draft gates
→ Review
→ user confirmation
→ validated and persisted CanonicalTrip
→ Presentation Projection
→ Result render
```

A successful provider response MUST NOT bypass Review or render directly. Only
a successfully confirmed and persisted CanonicalTrip may replace the active
trip and enter Result presentation.

## Goals / Non-Goals

**Goals:**

- Make the JSON sent for semantic interpretation an executable, versioned, locally validated contract.
- Establish a real source-neutral seam that Markdown and later spreadsheet adapters can satisfy without changing downstream trip or Result interfaces.
- Keep source-specific evidence available to Review through a presentation interface rather than raw source objects.
- Give the import/interpret/review transaction one workflow owner and one request identity.
- Bound the blocking processing modal with application-owned stage/overall deadlines and an explicit user stop action.
- Put provider-independent input/output gates in one deep interpretation module.
- Use exact `gemini-3.5-flash` as the benchmark-gated V0 default candidate without silently switching models.
- Emit a deterministic Day display tree with one primary placement per entity.
- Select Golden sample capabilities explicitly instead of inferring them from a trip ID.
- Preserve current schemas, persistence safety, privacy, benchmark gates, and Markdown behavior.

**Non-Goals:**

- Implement XLSX, XLS, or CSV intake.
- Add a second LLM provider, provider registry, server proxy, or automatic fallback model.
- Change CanonicalTrip persistence format or migrate existing confirmed trips.
- Generalize Golden Today/NOW/NEXT/checklist behavior.
- Add Hosted Delivery, accounts, multi-trip storage, place enrichment, recommendations, or replanning.
- Allow an LLM to choose UI components, layout, styling, or presentation fields.

## Decisions

### 1. Make `UnifiedSourceDocument` an executable source-domain contract

Create a source-domain module that owns:

```text
UnifiedSourceDocument JSON Schema
→ TypeScript types aligned to that schema
→ schema validation
→ deterministic relationship validation
→ source coverage expectation
→ Review evidence projection
```

The document envelope contains source identity, format identity, ordered evidence units, extraction findings, and no provider or UI metadata. Each evidence unit has a stable ID, source order, optional parent reference, stable locator, raw/display value, links/assets, and a constrained structural-evidence list. Structural evidence uses declared names and scalar/reference values rather than arbitrary unknown object members.

The schema includes discriminated Markdown and tabular evidence variants. Markdown V0 emits only the Markdown variant. The dormant tabular variant defines the stable seam needed by Spreadsheet V0.2—sheet identity/order, cell or region locator, row/column position, merge/header relationships, cached display value, formula evidence, and hyperlink evidence—but this change does not expose spreadsheet intake or claim spreadsheet acceptance.

Every adapter result passes both JSON Schema validation and deterministic checks before interpretation. Deterministic checks cover unique evidence IDs, contiguous source order where required, valid parent/header references, locator presence, source-ID agreement, and the absence of cycles in hierarchical evidence. The validated value becomes `ValidatedUnifiedSourceDocument`; unvalidated objects cannot satisfy the interpretation interface.

Alternatives considered:

- **Keep the type inside the Markdown adapter:** smallest current diff, but every new source format would need downstream edits and could bypass runtime validation.
- **Use an unrestricted `metadata` object:** easy to extend, but defeats strict input validation and permits accidental or hostile content shapes into the provider request.
- **Flatten every source to plain text:** simple schema, but loses the spreadsheet and Markdown relationships required for faithful interpretation and evidence-backed Review.

### 2. Use evidence-unit identity throughout interpretation and coverage

Replace Markdown-specific `block_ids` vocabulary at the source-neutral seam with `evidence_unit_ids`. For Markdown, one extracted Markdown block remains one evidence unit, so existing coverage semantics and benchmark locators are preserved. Future spreadsheet extraction may use cells or structurally complete regions according to its accepted adapter contract, but every included unit must still receive exactly one interpretation disposition.

The provider-neutral output schema may retain its current serialized field names during this change if changing them would invalidate frozen benchmark fixtures. In that case, one source-domain compatibility function maps `evidence_unit_ids` to the existing coverage field and records the naming debt. No second draft or canonical model is introduced.

Alternatives considered:

- **Rename every persisted/tested coverage field immediately:** semantically cleaner, but expands a boundary-hardening change into an output-schema migration and forces a new live benchmark acceptance run.
- **Continue calling all source evidence blocks:** works mechanically, but keeps Markdown terminology in a contract intended for tables and later structured sources.

### 3. Project source evidence before Review

Review components consume `ReviewEvidenceItem[]`, not `UnifiedSourceDocument`. A pure source-domain projection resolves source references and emits one of a small fixed evidence presentation grammar:

```text
text_excerpt
tabular_excerpt
asset_reference
missing_reference
user_authored
```

The projection carries stable reference, locator label, primary display value, and bounded surrounding context. It does not infer itinerary meaning. Markdown excerpts use the current original-text treatment. A future spreadsheet adapter can supply row/header context through `tabular_excerpt` without passing workbook objects into Review or creating a separate Review workflow.

Alternatives considered:

- **Let Review switch on source format:** leaks source adapters across the trust boundary and grows a parallel Review implementation for every format.
- **Show only normalized text:** hides the cell/row or hierarchy context needed to correct interpretation safely.

### 4. Put interpretation behind one deep interface

Introduce one application/domain-facing module:

```text
interpretTrip({ document, credential, signal })
  → ReviewCandidate | InsufficientResult
```

Its implementation performs, in order:

```text
validated source-document assertion
→ size/token preflight
→ provider request construction/invocation
→ provider envelope extraction
→ local response JSON Schema validation
→ source identity and complete coverage Gate A
→ Reviewable Draft Gate B
→ bounded application result
```

The Gemini adapter remains the true-external adapter. It owns endpoint construction, authentication header, HTTP status translation, retry/backoff, request deadline, cancellation, and extraction of the provider's structured JSON value. It does not decide whether the trip draft is reviewable. Tests use a fake provider adapter at the same internal seam.

This removes the current duplicate Reviewable Draft evaluation in both the Gemini adapter and `TripRuntimeStartup`. The deep interface hides provider envelopes and gate ordering from App and UI callers.

Alternatives considered:

- **Keep every gate in the Gemini adapter:** safe for one provider, but duplicates product policy across future provider implementations and confuses adapter errors with draft-policy failures.
- **Let the App call each validator in sequence:** exposes ordering constraints to a large UI coordinator and produces a shallow module whose complexity is repeated in tests and future callers.

### 5. Make `gemini-3.5-flash` the benchmark-gated default candidate

The exact stable model ID `gemini-3.5-flash` is the selected V0 default candidate. It supports structured outputs and the existing GenerateContent transport, but provider availability is not parser acceptance. The generated structured-output projection, deterministic fixtures, and live External Markdown Benchmark #001 must pass against this exact model before the production composition root activates it as the default when no test override is supplied.

Until that gate passes, production remains without an accepted default rather than silently pinning the candidate. After acceptance, the application uses the exact stable ID rather than a `latest` alias. A later model change must rerun the same fixtures and live benchmark. Provider/model identity remains configuration and diagnostic context only; it never enters `ParsedTripDraft`, `CanonicalTrip`, persistence, or Result presentation.

Automatic fallback to another Gemini model is intentionally excluded. Transport retry remains bounded and error-specific; an unsuccessful interpretation exits to preserved-source recovery. This avoids turning one user action into unbounded cost, latency, or parser-quality drift.

Alternatives considered:

- **Keep production model selection environment-only:** preserves the current gate but leaves an accepted build without a usable default and makes environments disagree after acceptance.
- **Use `gemini-flash-latest`:** reduces maintenance but permits an unbenchmarked model change behind a moving alias.
- **Automatically fall back to another Flash model:** may improve request availability but bypasses model-specific parser evidence and lengthens the blocking interaction unpredictably.

### 6. Give the candidate lifecycle one workflow owner and a bounded modal lifetime

The application workflow reducer owns source preparation, validated document, interpretation request identity, progress stage, interpretation result, Review draft/findings, confirmation, failure, cancellation, and stale-response rejection.

The Markdown intake hook retains only unsubmitted control state:

```text
selected input mode
selected File reference
pasted text value
local field touched/expanded state
```

Starting processing dispatches one application command/event. Progress UI reads workflow selectors. It no longer receives a `reportProgress` callback or maintains a second `interpreting/validating/failed` state. Starting a newer candidate aborts and invalidates the prior candidate while preserving the active trip.

The same workflow owner starts and clears configured stage/overall deadlines covering source reading, extraction, source validation, provider work, and local output validation until Review or another terminal state. The provider adapter retains its narrower per-attempt request deadline; the application deadline is an independent final safety net for any stage that never settles. Deadline expiry dispatches one bounded failure, aborts active work, closes the modal, and keeps the selected source plus current confirmed trip available.

While active, the full-screen modal remains protected from accidental Escape/backdrop dismissal, but it exposes an explicit `停止這次判讀` action. Stopping aborts the current session/request and returns to the recoverable Home intake state without clearing the selected file/paste value or the active confirmed trip. Success, insufficient, failure, timeout, and explicit stop are exhaustive terminal outcomes, and late events from an inactive identity are ignored.

Alternatives considered:

- **Keep two reducers synchronized by callbacks:** preserves current file ownership but creates invalid cross-products of state and makes each new source intake duplicate the orchestration protocol.
- **Move every input keystroke into the application reducer:** gives one owner at the cost of turning transient form editing into global workflow state; this is unnecessary.
- **Rely only on the Gemini fetch timeout:** does not cover source reading, extraction, local validation, or state synchronization failures and gives the user no immediate escape hatch.
- **Allow ordinary modal dismissal:** can hide active work without aborting it and permits late results to appear after the user believes the operation stopped.

### 7. Emit an ordered Day display tree with unique primary placement

Presentation Projection continues to be a pure `CanonicalTrip → TripPresentation` module, but a Day no longer exposes overlapping `timeline`, `optional`, and `relationshipGroups` collections as independent full render inputs. It emits ordered `items[]` using a discriminated union:

```text
entity
transit_connector
relationship_group
flexible_space
```

Optional items remain in a secondary disclosure collection because their separation is an explicit Result contract. Fixed-anchor and Overview summaries contain compact references to projected entities; they are summaries, not a second primary placement.

Alternative, conditional, fallback, and parent/child groups own the primary placement of their member entities and render the full relevant member presentation, including time precision, place, modifiers, dependencies, notes, unresolved state, and actions. Sequence relationships primarily constrain order. If one entity belongs to multiple incompatible primary groups and no deterministic nesting can be represented by the Canonical relationship model, authoritative validation blocks confirmation with a structured finding rather than duplicating it in Result.

The Renderer switches only on presentation item role. It does not inspect CanonicalTrip, source format, provider data, or relationship internals.

Alternatives considered:

- **Keep overlapping arrays and hide duplicates in React:** makes placement policy a renderer concern and lets different screens disagree.
- **Render relationship groups as title-only summaries:** avoids large groups but loses actions, readiness, unresolved state, and other confirmed semantics.

### 8. Route Golden behavior through explicit sample state

The composition root uses the existing explicit `sample` state supplied by the startup workflow. An explicitly opened bundled sample may use `GoldenViewer`. A persisted confirmed trip, including one whose ID equals the fixture ID, always renders the actual supplied CanonicalTrip through the confirmed-trip path.

Golden-specific runtime/checklist capabilities remain feature-owned. Trip ID remains data identity, not a capability flag.

Alternatives considered:

- **Reserve the Golden ID permanently:** simple, but a valid imported or corrected trip with that identity can be replaced visually by stale bundled data.
- **Remove GoldenViewer now:** would expand this change into generalized Today/checklist work and risk the real travel fallback.

### 9. Protect the seams with architecture and behavior tests

Add architecture tests that reject:

- App, Gemini, or Review imports from the Markdown adapter's concrete types.
- Result renderer imports from source, Review, provider, or Canonical modules.
- Provider adapters importing Reviewable Draft policy.
- a second owner of application interpretation/progress status.

Behavior tests cover valid and malformed source documents, no-provider-call rejection, source evidence projection, permanently pending stages, application/provider deadlines, explicit modal stop, stale/cancelled requests, insufficient outcomes, exact default-model selection after acceptance, unique Result placement, complete relationship-member rendering, and Golden sample routing. Existing parser, persistence, UI, and benchmark guardrails remain in place.

## Risks / Trade-offs

- **[The source-document schema is frozen before Spreadsheet V0.2 implementation experience]** → Base tabular evidence fields on the existing 25-sample research and Sample #24, keep the adapter disabled, and require any later incompatible change to version the contract rather than silently widening it.
- **[Moving source types touches many fixtures and imports]** → Migrate mechanically behind compatibility constructors first, then enforce forbidden-import tests after all callers cross the new seam.
- **[One workflow owner can make the reducer too large]** → Keep pure request coordination and interpretation as deep modules behind small interfaces; the reducer owns state transitions, not provider or extraction implementation details.
- **[An application deadline can stop legitimate slow work]** → Use explicit configured stage/overall budgets, show the active phase, abort cleanly, and preserve the source for a fresh retry rather than extending the lock indefinitely.
- **[`gemini-3.5-flash` is stable but may still fail this product's parser-quality gate or later be deprecated]** → Keep the production default disabled until its live benchmark passes, pin the exact ID after acceptance, and require the same gate before any replacement.
- **[Unique placement exposes ambiguous overlapping relationships previously hidden by duplication]** → Emit blocking deterministic findings and require Review correction instead of choosing a visually convenient but unsupported hierarchy.
- **[Relationship groups become visually denser when complete semantics are retained]** → Use nested semantic templates and bounded disclosure while preserving all confirmed meaning and actions.
- **[Golden routing changes could regress the real trip fallback]** → Add explicit sample, persisted-Golden-ID, checklist, Tokyo-time, and source-link browser regressions before removing the ID branch.
- **[Benchmark fixtures depend on current block terminology]** → Preserve serialized compatibility during this change unless a separately gated schema migration is explicitly approved.

## Migration Plan

1. Add the source-domain contract, JSON Schema, validators, fixtures, and Markdown compatibility constructor without changing the active workflow.
2. Switch Markdown extraction, source expectations, and Review evidence to the new source-domain interface; then enable dependency-direction tests.
3. Introduce the deep interpretation module around the existing Gemini transport, target exact `gemini-3.5-flash` in its model-specific acceptance fixtures, and remove duplicated output-gate calls.
4. Move processing state, application deadlines, explicit modal stop, and failure/cancellation ownership into the application workflow; reduce the intake hook to local form controls.
5. Introduce ordered Day display items, migrate Result templates, and add unique-placement and relationship-completeness tests.
6. Replace Golden ID capability routing with explicit sample state and verify persisted confirmed trips always render their supplied CanonicalTrip.
7. Run typecheck, unit/component suites, required mobile/desktop browser flows, build, diff checks, strict OpenSpec validation, and deterministic External Markdown Benchmark guardrails. Activate `gemini-3.5-flash` as the production default only after the separate key-backed live benchmark passes.

No persisted-data migration is required. Each stage remains revertible because the confirmed CanonicalTrip schema and repository are unchanged. If rollout fails, revert the current stage while retaining the new source schema files and fixtures only when no production caller depends on them.

## Open Questions

None block implementation. Spreadsheet extraction, chunk reconciliation strategy beyond the already documented contract, and any provider/output-schema renaming remain later gated changes.
