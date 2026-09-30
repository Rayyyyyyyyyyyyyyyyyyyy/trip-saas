> Archived 2026-09-07: completed work retained; unchecked tasks transferred, not passed. See [closure](./closure.md) and [successor handoff](../../complete-faithful-markdown-journey/handoff.md).

## 0. Preserve the diagnosed implementation baseline

- [x] 0.1 Record that the existing Gemini adapter already has a per-attempt request/body-read deadline, cancellation propagation, bounded `429` retry, safe failure translation, structured JSON parsing, and local response/coverage/Reviewable Draft rejection.
- [x] 0.2 Verify with focused unit and component suites that provider timeout and malformed interpretation failures terminate the current workflow, release the blocking modal, preserve retryable source input, and leave the confirmed trip unchanged (`46` focused unit tests and `6` focused component tests passed on 2026-09-04).
- [x] 0.3 Verify the malformed-response recovery path in desktop and mobile Chromium (`4` focused browser tests passed on 2026-09-04 with no reported console error or horizontal overflow).
- [x] 0.4 Record the remaining gaps without claiming an unreproduced incident: no visible `停止這次判讀`, no application-owned stage/overall watchdog, split intake/workflow processing state, no executable source-document input gate, overlapping Result projection arrays, and no accepted production Gemini default.
- [x] 0.5 Record that successful Gemini output enters local gates and Review; it MUST NOT replace the active trip or render until confirmation, authoritative validation, and persistence commit succeed.

## 1. Freeze the validated source-document contract

- [x] 1.1 Add failing contract fixtures/tests for valid Markdown evidence, valid dormant tabular evidence, unknown members, duplicate IDs, invalid parent/header references, missing locators, and invalid source order.
- [x] 1.2 Add `unified-source-document.v1.schema.json` with a strict source envelope, ordered evidence units, constrained links/findings, and discriminated Markdown/tabular structural evidence.
- [x] 1.3 Add source-domain TypeScript types aligned with the executable schema and expose an opaque/branded `ValidatedUnifiedSourceDocument` only through validation.
- [x] 1.4 Implement JSON Schema plus deterministic integrity validation for unique IDs, source identity, ordering, references, locators, hierarchy cycles, and extraction finding references.
- [x] 1.5 Add a source-coverage expectation helper using source-neutral evidence-unit identity while preserving compatibility with the frozen interpretation-response schema.

## 2. Move Markdown across the source-neutral seam

- [x] 2.1 Refactor the Markdown Source Adapter to emit the new source-domain document without exporting the shared contract from the Markdown feature.
- [x] 2.2 Preserve current Markdown block order, hierarchy, raw/display text, links, missing-relative-asset findings, stable IDs, and benchmark locators through compatibility tests.
- [x] 2.3 Validate every extracted document before it becomes a prepared candidate and map contract failures to the bounded extraction/source-document failure vocabulary.
- [x] 2.4 Update App, Gemini, Review, benchmark, unit, component, and browser fixtures to import the shared contract from its source-domain owner.
- [x] 2.5 Add an architecture test that rejects App, integration, Review, and Result imports from Markdown adapter-private types.
- [x] 2.6 Verify XLSX/XLS/CSV remain rejected and that the dormant tabular schema variant does not enable UI copy, file selection, or interpretation.

## 3. Add the pre-provider input gate

- [x] 3.1 Add failing tests proving malformed/unvalidated source documents never invoke the provider and never replace or hide the active trip.
- [x] 3.2 Integrate source-document assertion, source-ID agreement, and configured byte/token preflight immediately before provider invocation.
- [x] 3.3 Map schema, integrity, and request-limit failures to distinct safe phases/messages without exposing source content, schema paths, provider data, or credentials.
- [x] 3.4 Verify valid Markdown requests retain complete evidence identity in the serialized prompt and provider coverage expectation.

## 4. Project source evidence for Review

- [x] 4.1 Define the fixed `ReviewEvidenceItem` grammar for text excerpts, tabular excerpts, asset references, missing references, and user-authored items.
- [x] 4.2 Implement a pure projection from validated document plus source references to bounded Review evidence items with stable locator labels and context.
- [x] 4.3 Refactor Review, finding, insufficient-recovery, and source-excerpt surfaces to consume evidence projection rather than `UnifiedSourceDocument` or Markdown block types.
- [x] 4.4 Add component tests for Markdown excerpts, missing references, user-added entities, and tabular evidence presentation without workbook objects.
- [x] 4.5 Prove source documents and Review evidence remain session-only and do not enter CanonicalTrip, Canonical JSON import, confirmed-trip persistence, or Result props.

## 5. Deepen semantic interpretation

- [x] 5.1 Add a provider transport port whose production Gemini adapter returns only the extracted structured value or a bounded transport failure; provide a fake adapter for interface-level tests.
- [x] 5.2 Move response-schema validation, source identity/coverage Gate A, and Reviewable Draft Gate B into one `interpretTrip` implementation with a bounded `ReviewCandidate | InsufficientResult` outcome.
- [x] 5.3 Keep Gemini endpoint, exact model selection, `x-goog-api-key`, per-attempt timeout, cancellation, envelope parsing, status translation, and bounded `429` retry inside the Gemini transport adapter; use `gemini-3.5-flash` as the acceptance/default candidate and do not add a moving alias or automatic model fallback.
- [x] 5.4 Remove duplicated schema/Reviewable Draft evaluation from the Gemini adapter and `TripRuntimeStartup` after the deep interpretation interface owns the full ordering.
- [x] 5.5 Add interface-level tests for valid draft, insufficient result, malformed envelope, schema-invalid result, incomplete coverage, non-reviewable draft, timeout, authentication failure, rate limit, cancellation, exact model selection, absence of silent model fallback, and safe diagnostics.
- [x] 5.6 Add an architecture test that prevents provider adapters from importing Reviewable Draft policy or returning provider-specific types through the application interface.
- [x] 5.7 Keep production model activation gated while running the generated-schema and deterministic parser fixtures against exact `gemini-3.5-flash`; enable it as the no-override production default only after task 10.5 records a passing live benchmark.

## 6. Consolidate candidate workflow ownership

- [x] 6.1 Extend the application workflow events/state/selectors so source reading, extraction, source validation, interpretation, output validation, configured stage/overall deadlines, Review, confirmation, failure, explicit stop, cancellation, and success have one owner.
- [x] 6.2 Reduce the Markdown intake hook to unsubmitted file/paste control state and remove its synchronized interpreting, validating, prepared-candidate, and processing-failure state.
- [x] 6.3 Replace `reportProgress` callback synchronization with workflow-derived progress selectors consumed by the intake/progress surface.
- [x] 6.4 Keep application watchdog timers, session/request cancellation, abort propagation, timer cleanup, and stale-response rejection inside the application workflow/request coordinator while preserving selected source retry/edit behavior.
- [x] 6.5 Add reducer/component tests for permanently pending reading/extraction/provider/validation stages, application deadline, provider timeout, replacement during extraction, replacement during provider request, explicit modal stop, late success, late failure, retry, insufficient recovery, and confirmation failure.
- [x] 6.6 Verify every failed or cancelled candidate leaves the current confirmed trip readable and only a committed repository replacement changes `activeTrip`.
- [x] 6.7 Add the visible `停止這次判讀` action to the active full-screen modal, keep accidental Escape/backdrop dismissal disabled, and verify stop/timeout/failure always close the modal into preserved-source recovery.

## 7. Emit a non-overlapping Result display tree

- [x] 7.1 Add failing projection/component tests proving alternative/conditional/fallback/parent-child members are not rendered as both standalone timeline entities and full relationship members.
- [x] 7.2 Add deterministic relationship-placement validation for incompatible multiple primary groups and emit a blocking finding before confirmation.
- [x] 7.3 Refactor Day Presentation Projection to emit ordered discriminated display items plus separate optional disclosure and compact summary references.
- [x] 7.4 Make sequence relationships constrain primary-item order without rendering a second full sequence group.
- [x] 7.5 Refactor relationship templates to preserve member time precision, place, modifiers, dependencies, notes, unresolved state, and exact safe actions.
- [x] 7.6 Preserve transit connector treatment while allowing source-supported critical booked transport to retain prominent entity presentation and its actions/dependencies.
- [x] 7.7 Update projection, component, and browser stress fixtures for unique placement, complete relationships, optional separation, fixed-anchor summaries, transit, and source-agnostic rendering.

## 8. Make Golden sample routing explicit

- [x] 8.1 Pass the existing explicit sample state through the composition root and select `GoldenViewer` only for an explicitly opened bundled sample.
- [x] 8.2 Ensure persisted/imported confirmed trips always render the supplied CanonicalTrip even when their ID equals the bundled Golden fixture ID.
- [x] 8.3 Add component/browser regressions for explicit sample opening, active-trip preservation, persisted Golden-ID rendering, checklist compatibility, Tokyo-time behavior, and exact source links.

## 9. Align durable architecture records

- [x] 9.1 Update `03_PIPELINE_SPEC.md` and `01_CANONICAL_CONTEXT.md` with the executable pre-LLM source-document gate, source-neutral evidence ownership, application-level modal deadline/cancellation contract, and benchmark-gated `gemini-3.5-flash` default decision.
- [x] 9.2 Update `06_RESULT_UI_SPEC.md` with the unique primary-placement and complete relationship-member invariants.
- [x] 9.3 Update `07_FUNCTIONAL_SPEC.md`, `05_V0_IMPLEMENTATION_PLAN.md`, relevant feature READMEs, and `CONTEXT.md` only where their owned behavior/terminology changes; record `gemini-3.5-flash` as the selected candidate now while keeping production activation explicitly blocked until task 10.5 passes.
- [x] 9.4 Verify the document authority order remains consistent, Spreadsheet V0.2 remains gated, and no hosted-delivery, provider-registry, or source-format scope is introduced.

## 10. Verify the hardened boundaries

- [x] 10.1 Run `npm run typecheck`, `npm run test:unit`, and `npm run test:component`; record all source-contract, interpretation-interface, workflow, projection, routing, and architecture tests passing.
- [x] 10.2 Run focused Playwright flows at mobile and desktop viewports for successful Markdown import, malformed pre-provider input, permanently pending non-provider/provider stages, application/provider timeout, explicit modal stop, provider/output failure, cancel/retry, late completion, Review confirmation, unique relationship rendering, and Golden sample routing; verify the modal always terminates, with no console errors or horizontal overflow.
- [x] 10.3 Run `npm run build`, `git diff --check`, and `openspec validate harden-source-to-render-boundaries --strict`.
- [x] 10.4 Run the deterministic External Markdown Benchmark #001 guardrails and verify unchanged critical-event, ambiguity, schema-validity, coverage, and silent-omission expectations.
- [ ] 10.5 Run the live External Markdown Benchmark #001 against exact `gemini-3.5-flash` with an explicitly supplied personal key before activating or claiming the production default; if no key is available or the gate fails, record the blocked external gate and leave production without the new default. The authorized 2026-09-07 run failed; field-guidance, uncertainty-instruction, and comparison-reporting follow-up is tracked in `../2026-09-07-fix-gemini-schema-failure-recovery/tasks.md` sections 6–8 and shares this acceptance evidence.
- [x] 10.6 Inspect the final diff for raw source/provider payloads, credentials, persistent source evidence, accidental spreadsheet enablement, unrelated user changes, and any source/provider import reaching Result UI.
- [x] 10.7 Inspect the final workflow/model diff to confirm no processing state can hold the modal without a deadline or explicit stop, no timer survives a terminal transition, and no moving alias or silent fallback model was introduced.
