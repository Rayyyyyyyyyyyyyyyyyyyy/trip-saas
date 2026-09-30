> Archived 2026-09-07: completed work retained; unchecked tasks transferred, not passed. See [closure](./closure.md) and [successor handoff](../../complete-faithful-markdown-journey/handoff.md).

## 1. Baseline, dependencies, and benchmark harness

- [x] 1.1 Audit existing framework/browser capabilities and record every required production dependency with one concrete responsibility before installation; do not add generic utility or speculative state/provider packages.
- [x] 1.2 Add Vitest, React Testing Library, jsdom, and Playwright configuration plus repository scripts for unit, component, and browser checks.
- [x] 1.3 Add Golden Viewer characterization tests for pre-trip countdown/next event, each in-trip Tokyo date transition, supported NOW/NEXT behavior, and post-trip access.
- [x] 1.4 Add Golden characterization tests for exact Google Maps/Tabelog URLs, reservation/checklist synchronization, the USJ unconfirmed default, and runtime-failure fallback.
- [x] 1.5 Capture mobile and desktop Golden smoke flows covering keyboard navigation, horizontal overflow, 44px targets, and console-error assertions.
- [x] 1.6 Create a sanitized External Markdown Benchmark #001 fixture with stable source references, annotated critical events, annotated ambiguities, expected unsupported-exact constraints, and a repeatable scoring/report format.
- [x] 1.7 Create semantic feature/domain/integration/persistence folders without moving unrelated code or introducing generic `utils`, `helpers`, or `common` modules.
- [x] 1.8 Complete a requirement-to-task traceability audit so every delta requirement has an implementation task and a verification task, every blocking design question has an earlier decision gate, and every exception is recorded before apply work continues.
- [x] 1.9 Convert all active application, test, fixture-harness, and tool-configuration code to strict TypeScript, add no-emit type checking to the production build, keep research/reference samples outside the migration boundary, and synchronize this durable language/runtime-validation boundary into the current `spec/` documents.

## 2. Versioned data contracts

- [x] 2.1 Define the executable versioned `TextSourceInput` JSON Schema with strict members, input modes, media type, and non-empty content rules.
- [x] 2.2 Define `parsed-trip-draft.v1.schema.json` with stable IDs, trip/day/entity/reference shapes, explicit nullability, supported semantic/time/state enums, relationships, supporting items, and findings.
- [x] 2.3 Define `semantic-interpretation-result.v1.schema.json` with the `draft | insufficient` discriminator, matching source identity, findings, complete coverage, and explicit unparsed items.
- [x] 2.4 Define the strict versioned CanonicalTrip schema and the allowlisted conversion contract from a reviewed candidate.
- [x] 2.5 Add Ajv validators and fixture tests for valid, missing-member, unknown-member, invalid-enum, nullability, discriminated-result, and bad-reference cases.
- [x] 2.6 Add a Gemini-compatible schema projection and contract tests proving it preserves every required field, type, and enum from the authoritative product output contract.

## 3. Early Golden migration checkpoint

- [x] 3.1 Convert the checked-in Osaka trip into a schema-valid Golden CanonicalTrip fixture while preserving every itinerary fact and stable checklist/reservation identity.
- [x] 3.2 Validate the Golden fixture against the authoritative itinerary and `temp/trip_places_google_maps.md`, including byte-for-byte preservation of source-provided external URLs.
- [x] 3.3 Implement the minimum pure Presentation Projection needed to render Golden Overview and Day from CanonicalTrip without source-format or legacy-fixture reads.
- [x] 3.4 Isolate Golden-only Today, checklist, and reservation behavior behind explicit Golden feature ownership without adding those destinations to generalized V0 navigation.
- [x] 3.5 Run Golden characterization tests, required viewport smoke tests, `npm run build`, and `git diff --check` before continuing to untrusted-input work.

## 4. Domain validation and complete projection

- [x] 4.1 Implement deterministic response validation for schema/source-version agreement, source-ID matching, coverage totals, unique block dispositions, and unparsed-item completeness.
- [x] 4.2 Implement ParsedTripDraft validation for stable IDs, day/entity/source references, dates, trip range, time precision, cross-midnight/open-ended rules, and logical conflicts.
- [x] 4.3 Implement relationship/reference validation for sequence, alternative, conditional, fallback, parent/child, duplicate candidates, reservations, tickets, and readiness objects.
- [x] 4.4 Implement explicit Gate A, Reviewable Draft, and Renderable Confirmed Result evaluators with structured findings.
- [x] 4.5 Implement the reviewed-candidate builder and authoritative CanonicalTrip validator without React or provider dependencies.
- [x] 4.6 Extend Presentation Projection for exact/approximate/range/daypart/no-time/open-ended/all-day/cross-midnight time semantics and fixed-anchor priority.
- [x] 4.7 Extend Presentation Projection for free/flexible/optional/tentative content and alternative/conditional/fallback/parent-child relationship groups.
- [x] 4.8 Extend Presentation Projection for transit connectors, readiness/reservation/ticket states, notes, supporting references, exact links, and unresolved states.
- [x] 4.9 Add time and date semantic fixtures covering mixed notation, missing anchors, open-ended ranges, cross-midnight events, and intentionally untimed content.
- [x] 4.10 Add relationship and state fixtures covering optional-heavy, free-time-heavy, tentative, alternatives, conditions, fallbacks, readiness, and unresolved places.

## 5. Credential security decision gate

- [x] 5.1 Prototype persistent non-exportable Web Crypto key storage in IndexedDB on the supported Chrome and Safari targets and record reproducible compatibility results.
- [x] 5.2 Decide and document the credential storage contract and unsupported-browser behavior; no path may persist a plaintext key in localStorage.
- [x] 5.3 Define and verify a deployment Content Security Policy that permits the required direct Gemini endpoint while blocking unapproved credential-bearing destinations.
- [x] 5.4 Add a request/error instrumentation test proving API keys and raw source content are redacted from logs, analytics, diagnostics, and unrelated network calls.
- [x] 5.5 Update the design decision before implementation if the compatibility spike requires a different compliant storage mechanism or supported-browser boundary.

## 6. Browser persistence and migration

- [x] 6.1 Implement a versioned IndexedDB `confirmedTripRepository` that validates reads and supports transactional active-trip replacement.
- [x] 6.2 Implement the Gemini credential repository using the approved result of the credential security gate, with persistent same-browser access and explicit clearing.
- [x] 6.3 Implement separate trip-data, credential, and all-local-data clear operations with explicit scope and failure handling.
- [x] 6.4 Implement trip-scoped checklist persistence and migrate/synchronize the legacy `osaka-trip-todos` key for the Osaka fixture.
- [x] 6.5 Add storage-inspection and reload tests proving raw uploads, pasted source, UnifiedSourceDocument, source excerpts, full provider responses, and ReviewSession state are never durable.
- [x] 6.6 Add repository tests for valid reload, invalid/unsupported records, failed migrations, atomic rollback, scoped clearing, credential failure, and checklist compatibility.
- [x] 6.7 Run persistence/unit tests, Golden smoke tests, `npm run build`, and `git diff --check` before connecting the workflow shell.

## 7. Application workflow shell

- [x] 7.1 Implement reducer-owned workflow states and events for intake, extraction, parsing, validation, Review, confirmation, failure, and cancellation.
- [x] 7.2 Implement derived workflow selectors so components do not maintain synchronized copies of candidate, validation, or active-trip state.
- [x] 7.3 Add unique session/request identities and abort handling so stale asynchronous responses cannot advance or replace the current workflow.
- [x] 7.4 Implement one active-trip plus one in-memory candidate state and keep the active trip readable throughout replacement processing.
- [x] 7.5 Implement Home-first startup: open a validated active trip when present, otherwise show Home without auto-activating Osaka.
- [x] 7.6 Centralize local screen/day navigation in the app shell without adding a router or duplicating selected-day state.
- [x] 7.7 Add reducer tests for clean start, active reload, replacement success, validation/provider failure, explicit cancel, surface close, persistence rollback, and stale responses.

## 8. Home and Markdown source intake

- [x] 8.1 Build the mobile-first Home with MUI interaction primitives and project Tailwind layout/tokens, separate file/paste modes, and a non-blocking reserved area for unapproved future optional fields.
- [x] 8.2 Verify that the reserved optional area creates no traveler-profile requirement and never blocks Markdown intake or Canonical JSON import.
- [x] 8.3 Implement pasted-text character count, empty validation, disabled start, explicit submit, clear, and replace behavior.
- [x] 8.4 Normalize file and pasted input through the same `TextSourceInput` contract and enforce supported type, readability, non-empty, and configured size limits.
- [x] 8.5 Implement Markdown block construction with ordered structure, hierarchy, raw text, links, GFM table evidence, and deterministic source references.
- [x] 8.6 Implement pasted-input locators and non-fatal missing relative asset findings without assigning itinerary semantics in the Source Adapter.
- [x] 8.7 Add truthful progress and privacy/format guidance covering Gemini transmission, browser/session storage, applicable free/paid Gemini data-use differences, Markdown V0, gated spreadsheets, and unsupported PDF input.
- [x] 8.8 Keep Gemini settings, Canonical JSON import, privacy details, and the Golden sample visibly reachable from Home secondary controls.
- [x] 8.9 Add adapter fixtures for headings/lists/tables/links, `A > B > C`, mixed time notation, inline multi-unit lines, address-first places, and free time.
- [x] 8.10 Add adapter fixtures for broken assets, stable file/paste locators, source order, empty input, unsupported type, and configured size limits.
- [x] 8.11 Add Home component tests for both intake modes, optional-slot non-blocking behavior, progress states, privacy disclosure, secondary controls, and active-trip preservation on intake failure.

## 9. Gemini semantic interpreter and parser-quality gate

- [x] 9.1 Implement the provider-neutral `parseTrip` application contract and one Gemini integration module without a provider registry.
- [x] 9.2 Implement direct Gemini requests using the `x-goog-api-key` header, structured output, abort signals, safe response extraction, and no credential/provider metadata leakage.
- [x] 9.3 Implement configured token/size preflight plus bounded retry/backoff for retryable rate-limit failures and actionable provider error translation.
- [x] 9.4 Validate every Gemini response against the full local schema and deterministic gates before exposing `draft` or `insufficient` outcomes.
- [x] 9.5 Implement complete block accounting and structured unparsed-item handling with no silent omissions.
- [x] 9.6 Add mocked adapter tests for draft, insufficient, malformed JSON, schema-invalid output, wrong source ID, incomplete coverage, cancellation, stale completion, rate limit, and non-retryable failure.
- [ ] 9.7 Run candidate model/thinking-level comparisons against the frozen External Markdown Benchmark #001 parser-quality harness and record critical missing/invented/unsupported-exact counts, ambiguity recall, schema validity, and source coverage.
- [ ] 9.8 Pin the exact stable Gemini model only if the parser-quality benchmark passes; otherwise record the failed gate and leave production pinning blocked.
- [x] 9.9 Run parser/unit tests, Golden smoke tests, `npm run build`, and `git diff --check` before beginning Review UI work.

## 10. Evidence-backed Review

- [x] 10.1 Build the centered single-column Review shell shared by mobile and desktop, with a read-only source excerpt before each material finding or correction surface.
- [x] 10.2 Render blocking errors, warnings, ambiguity, low confidence, broken evidence, preserved references, unparsed items, conflicts, and user overrides individually.
- [x] 10.3 Implement editing for date/day, title, semantic type, note, and place text with original-to-new user-correction visibility.
- [x] 10.4 Implement exact/approximate/range/daypart/no-time/open-ended time editing and independent optional/tentative/flexible flags.
- [x] 10.5 Implement add-missed-entity behavior with stable IDs, explicit null/default values, relationship validation, and user-authored provenance.
- [x] 10.6 Implement delete-false-entity and revert-correction behavior with dependent-reference findings.
- [x] 10.7 Recompute deterministic candidate findings after edits without storing synchronized duplicate validation state.
- [x] 10.8 Implement bounded structural recovery for schema-valid insufficient results without allowing normal Review or guessed itinerary structure.
- [x] 10.9 Implement authoritative pre-confirm validation and show success only after the persistence transaction commits.
- [x] 10.10 Add component tests for every editable field, time mode, flag combination, original-to-new diff, add/delete/revert, and evidence visibility.
- [x] 10.11 Add mobile/desktop browser tests for correction parity, keyboard/focus order, 44px controls, cancellation, stale responses, failed confirmation, and active-trip preservation.

## 11. Canonical activation and import

- [x] 11.1 Connect confirmed Review output to the candidate builder, authoritative validator, and transactional active-trip replacement repository.
- [x] 11.2 Build confirmation success actions that resolve the same newly active trip across Home, Overview, and Day and clear pending candidate state.
- [x] 11.3 Implement strict Canonical JSON import for supported schema versions through the same validation and activation transaction without Gemini or Review.
- [x] 11.4 Reject unknown/non-trip import fields, invalid semantics, and unsupported schema versions without modifying the active trip.
- [x] 11.5 Verify that V0 exposes Canonical JSON import but no Canonical JSON export action.
- [x] 11.6 Add integration tests for first activation, replacement success, rollback, stale responses, imported-trip activation, and storage exclusion of non-trip/source data.
- [x] 11.7 Run activation/import tests, Golden smoke tests, `npm run build`, and `git diff --check` before generalized Result UI completion.

## 12. Generalized Result UI

- [x] 12.1 Build source-agnostic Result template boundaries that accept Presentation Projection only, never raw Canonical/source/provider data.
- [x] 12.2 Implement Overview trip identity, dates/geography, journey sequence, conditional readiness attention, critical anchors, and day index with absent sections omitted.
- [x] 12.3 Implement the Day shell, day identity/context, fixed-anchor region, and primary semantic timeline reading order.
- [x] 12.4 Implement optional and free-time treatment outside the committed hierarchy without task-completion semantics.
- [x] 12.5 Implement alternative, conditional, fallback, sequence, and parent/child relationship templates without flattening their meaning.
- [x] 12.6 Implement transit connectors, reservation/ticket/readiness states, notes, supporting context, and unresolved-state treatments.
- [x] 12.7 Implement exact/approximate/range/daypart/no-time/open-ended/all-day/cross-midnight visual precision without invented values.
- [x] 12.8 Implement mobile horizontal Date Rail and desktop persistent day navigation with one active-day state, keyboard operation, active-date visibility, and reorientation to Day start.
- [x] 12.9 Apply frozen semantic light/dark color and typography roles through one MUI theme/Tailwind token source without changing the approved prototype system.
- [x] 12.10 Preserve exact source-provided external URLs with new-tab and safe `rel` behavior and omit guessed actions when no confirmed URL exists.
- [x] 12.11 Omit generalized Today/runtime navigation and unsupported NOW/NEXT/leave-by states while keeping static Overview/Day usable under runtime failure.
- [x] 12.12 Add component tests for missing sections, all time modes, optional/free-time states, relationships, transit, readiness, unresolved content, and broken/absent actions.
- [x] 12.13 Add mobile/desktop browser tests for overflow, 44px targets, focus order, Date Rail overflow, contrast, semantic hierarchy, and runtime-unavailable states.

## 13. Golden fallback integration

- [x] 13.1 Add the explicit Home Golden sample/fallback action and verify that it never silently activates on clean start.
- [x] 13.2 Verify Golden Overview/Day still render through the shared projection while Today/checklist/reservations remain isolated Golden capabilities.
- [x] 13.3 Re-run pre-trip, during-trip, and post-trip Tokyo-time characterization plus checklist/reservation synchronization, USJ default, exact links, directions, and runtime degradation.
- [x] 13.4 Run complete Golden mobile/desktop smoke tests, `npm run build`, and `git diff --check` before final acceptance.

## 14. Final acceptance and scope audit

- [x] 14.1 Run all unit, component, and Playwright tests plus `npm run build` and `git diff --check` on the completed implementation.
- [ ] 14.2 Re-run External Markdown Benchmark #001 through the final integrated parser and confirm zero critical missing/invented/unsupported-exact facts, all annotated ambiguities surfaced, valid schema, 100% coverage, and zero silent omissions.
- [ ] 14.3 Complete benchmark Review on mobile and desktop, validate the corrected CanonicalTrip, and render it through generalized Overview/Day.
- [ ] 14.4 Record Review recovery and Result usability observations required by `08_PRODUCT_VALIDATION_PLAN.md`, including any failed scope-expansion gate.
- [x] 14.5 Verify production browser storage contains no raw source, excerpts, provider response, ReviewSession, or Gemini credential plaintext after success, failure, cancellation, clearing, and reload.
- [x] 14.6 Run a final diff-based scope audit confirming no Hosted Delivery, spreadsheet/PDF input or export, account, multi-trip, provider registry, recommendation, or replanning implementation entered this change.
- [x] 14.7 Re-run `openspec validate build-trip-runtime-v0 --strict` and update current `spec/` documents for any implementation decision that changed a normative contract.
