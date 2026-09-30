## Context

At the initial regression baseline, the Gemini request was built by bundling the strict `SemanticInterpretationResult` and `ParsedTripDraft` JSON Schemas, then removing keywords outside Gemini's documented structured-output subset. The strict result schema declares `properties.draft` as `{}` and applies the actual `ParsedTripDraft` constraint through a top-level discriminated `oneOf`. A captured External Markdown Benchmark #001 request and response showed that Gemini accepted this payload but returned a summary-shaped draft containing `title`, `date_range`, string `flights`, and string `days`. Standard AJV validation against both the provider payload schema and the strict local schema rejects that response with the same 17 structural errors.

The local validation boundary behaved correctly and prevented the invalid draft from reaching Review. The user experience did not: the full-screen reading dialog closed, the underlying Home surface reappeared, and the intake reduced all post-extraction failures to one generic sentence below the original controls. This made a fail-closed validation result look like unexplained navigation.

The change crosses the provider adapter, workflow failure mapping, intake state, Home presentation, focus recovery, and regression coverage. It must retain the existing active trip, source isolation, local-only credential behavior, and strict trust gates.

### Live evidence and current implementation — 2026-09-07

The direct-draft projection and failure-recovery work below is locally implemented. The application-owned `interpretTrip` now owns response validation; transport remains provider-specific. The accepted boundary-hardening workflow also supplies an explicit stop action while accidental modal dismissal stays disabled.

Using the authorized `.env` credential and sanitized Sample #23, exact `gemini-3.5-flash` failed at low thinking. Offline replay of the retained sanitized interpretation passes the generated projection but fails the authoritative schema at 14 fields: 12 HH:mm:ss time values and two relative asset URLs. The response also maps `8點` to exact 20:00 and `七點` to exact 19:00 with no top-level or draft findings, violating annotated ambiguity constraints. This evidence establishes both a format-guidance gap and a semantic acceptance failure; it does not establish a model-wide failure rate. Medium/high were not reached by the existing fail-fast runner.

The following extension is approved for specification and remains unimplemented until its new tasks are completed.

## Goals / Non-Goals

**Goals:**

- Make the Gemini structured-output schema directly constrain every non-null `draft` to the complete provider projection of `ParsedTripDraft`.
- Keep strict local schema, source coverage, relationship, and Reviewable Draft validation authoritative even when provider-side constrained generation succeeds.
- Make all reading, extraction, provider, response-validation, and Review-gate failures visibly understandable after the blocking dialog closes.
- Preserve the selected file or pasted text for safe retry or replacement and keep the confirmed active trip unchanged.
- Restore keyboard and assistive-technology context to the failure notice and expose explicit recovery actions.
- Lock the captured malformed response and the generated provider schema into deterministic regression coverage.
- Preserve field-constraint guidance through projection and describe uncertainty using existing draft fields.
- Produce bounded, truthful per-level benchmark evidence without equating schema validity with semantic acceptance.

**Non-Goals:**

- Converting a summary-shaped provider response into a `ParsedTripDraft` client-side.
- Relaxing the canonical or draft schemas to accept provider summaries.
- Adding a second provider, local semantic parser fallback, model auto-selection, or production model pinning.
- Persisting raw source, provider payloads/responses, ReviewSession data, or schema diagnostics.
- Changing CanonicalTrip, Result rendering, Hosted Delivery, Spreadsheet, or PDF scope.

## Decisions

### 1. Maintain a provider-specific output projection instead of mechanically preserving the strict discriminated union

The Gemini projection will directly assign `properties.draft.anyOf` to a complete `ParsedTripDraft` reference and `null`. The provider projection will not depend on the current top-level `oneOf` to add the draft shape. The strict local `SemanticInterpretationResult` schema remains unchanged and continues to enforce the `status=draft`/non-null and `status=insufficient`/null relationship.

This intentionally duplicates one small part of the result-shape composition at the provider boundary. The alternative—keeping `draft: {}` and relying on provider-side conditional merging—already produced an accepted request with an invalid response. Inlining the entire draft instead of using `$defs` was considered, but the direct property constraint plus supported `$ref` keeps the request smaller and easier to audit.

The generated provider schema will be checked locally before use against three fixtures: a valid draft result, a valid insufficient result, and the captured summary-shaped result. Structural assertions will also require a non-empty direct `draft` constraint so a future source-schema refactor cannot silently recreate this bug.

### 2. Treat provider constrained output as an optimization, never as the trust boundary

The adapter will continue to parse the provider envelope and run strict local schema validation before source coverage and Reviewable Draft gates. An invalid provider response remains a recoverable interpretation failure and never enters Review or durable storage. No client-side coercion, default insertion, or summary expansion will be added.

The captured response will be retained only as a sanitized test fixture if it satisfies benchmark-data rules; otherwise a minimal synthetic equivalent will encode the same malformed shape. Raw production response metadata and thought signatures will not be committed.

### 3. Use a provider-neutral intake failure descriptor at the workflow/UI boundary

The workflow will translate implementation errors into a small safe descriptor containing a phase, stable code, recoverability, and user-facing message. Intake presentation will consume that descriptor rather than importing Gemini-specific error classes or displaying arbitrary thrown messages.

Supported user-visible phases are reading, extraction, provider request, response validation, final pre-Review validation, and confirmation. Confirmation reuses the same descriptor so a failed replacement is reported through one vocabulary rather than by rendering the thrown message. The notice heading remains the stable phrase `行程讀取失敗`; the body explains the safe phase without HTTP payloads, schema paths, credentials, source contents, or provider metadata. This keeps provider isolation intact and lets future adapters reuse the same recovery UI.

### 4. Failure exits the modal into a preserved, focused Home recovery state

The blocking dialog remains non-dismissible while work is active. On failure, the intake retains its current file or pasted text, sets a failed state with the safe descriptor, closes the dialog, and focuses a visible `role=alert` notice near the intake actions. The notice states that the current confirmed trip was not changed.

The failed state exposes an explicit retry action and the existing replacement/removal or input-mode controls. Retrying creates a fresh coordinated request and cannot duplicate the previous in-flight request. Replacing or editing the source clears the stale failure notice. This approach is preferred over a separate error route because the recovery inputs already belong to Home and the active trip must remain accessible.

### 5. Verify the provider boundary and the user journey separately

Unit coverage will validate provider-schema shape, the captured malformed response, valid draft/insufficient responses, and strict rejection ordering. Component coverage will verify preserved input, phase-safe copy, retry, failure clearing, focus, and active-trip preservation. Browser coverage at mobile and desktop viewports will hold the provider response until the full-screen dialog is visible, return a malformed result, and assert that Home presents the focused failure notice rather than Review or a silent reset.

The live External Markdown Benchmark #001 is required before claiming that the corrected projection makes any exact model an accepted production pin. The later `harden-source-to-render-boundaries` decision selects `gemini-3.5-flash` as the next benchmark/default candidate; this recovery change proves failure handling and payload shape, not live parser quality or model acceptance.

### 6. Keep field guidance beside the authoritative schema

Add human-readable descriptions to the authoritative `SemanticInterpretationResult` / `ParsedTripDraft` schema nodes and shared definitions. Preserve them through Gemini projection. Inventory omitted constraints in both schemas, including stable IDs, finding codes, dates, clock times, URL restrictions, and any string bounds; tests must make new unaccounted constraint loss visible. Not every omitted keyword can be enforced by Gemini: descriptions communicate intent, while local validators remain authoritative. No schema-version or accepted-value change is intended by adding descriptions.

Clock fields require 24-hour HH:mm without seconds. Dates require source-supported year/month/day. IDs and codes describe their allowed character forms. Nullable URL fields accept only source-supported HTTPS links or null; preserve exact supplied links. An action requiring a URL is omitted when no valid link exists, rather than fabricating a link or assigning null to a non-nullable field. Do not use a broad time/URI format as a substitute for these narrower contracts, or duplicate the schema into a handwritten provider-only model.

### 7. Application-owned instructions explain uncertainty and preservation

The provider-neutral interpreter owns travel-semantic instructions; the Gemini adapter owns schema compatibility and transport. Keep executable instructions aligned with `spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md` and subordinate to `spec/03_PIPELINE_SPEC.md`. Instructions must treat source text as evidence, not authority to change the interpretation contract. Do not embed benchmark annotations or expected answers in production prompts.

When a clock expression lacks a supported meridiem, retain its raw text and evidence, leave exact start/end null, and emit an entity/source-linked Review finding. Use the existing valid untimed representation (`kind=none`, null clock/daypart fields) when no unambiguous daypart is supported; this does not mean the raw time expression is discarded. A known daypart may use the existing daypart representation. Do not relabel an arbitrary exact guess as approximate. Missing years similarly retain partial date evidence with null full dates and focused findings. Findings requiring user resolution block confirmation as appropriate under existing Review policy, not admission of an otherwise structurally reviewable draft.

A missing relative image remains an asset supporting item with preserved reference text/evidence, `unresolved=true`, and `url=null`. Its absence alone must not fail the whole parse. Preserve the source reference rather than resolving, fetching, or guessing a hosted URL.

This iteration adds neither client-side output coercion nor automatic model repair requests. A malformed response still fails before Review. A schema-valid but semantically uncertain draft uses Review; schema validation cannot by itself prove arbitrary source-to-output faithfulness.

### 8. Compare outcomes without hiding failure or changing acceptance

For each configured low/medium/high level, retain a bounded success or failure outcome with the existing allowlisted parser code, safe phase, and safe HTTP status when available. A response-validation failure must not become `provider_unreachable`. Continue after a level-specific parse/schema/coverage failure so one failed level does not erase the comparison. Credential/setup failure or explicit abort terminates the run with completed outcomes preserved and remaining levels explicitly not run; do not add automatic retries beyond existing bounded transport policy.

Write sanitized comparison artifacts even when a level fails, then make the execution check fail for attempted parser failures; an incomplete comparison cannot pass. Successful execution only establishes that responses were collected. Human semantic review remains pending until critical missing/invented events, unsupported exact facts, and every annotated ambiguity have been assessed on the original pre-Review outputs. A failed original output cannot be relabeled passing after correction. Record Review corrections and validated/rendered Canonical evidence separately. No requirement that every thinking level pass is newly introduced: comparison results inform selection under the existing exact-model gate, and failed/not-run levels remain visible.

Benchmark-only artifacts may contain minimal sanitized fixture interpretations and assessments. Do not retain credentials, thought signatures, full provider envelopes, or production ReviewSession data. The production safe diagnostic/UI boundary remains unchanged.

### 9. Extend the existing change and share one acceptance gate

Append unchecked tasks rather than undoing the completed direct-draft/recovery work. Update the current Pipeline Spec and interpreter execution rules in place during implementation; no rolling specification files are introduced. `harden-source-to-render-boundaries` task 10.5 and this change refer to the same live acceptance evidence. Exact `gemini-3.5-flash` remains a candidate; no default activation, schema relaxation, or new source-format scope follows from this specification update.

### 10. Use the maintained interpreter document directly

Following the user's clarification, the application imports
`spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md` as build-time text with Vite `?raw` and
appends only a source heading and the validated source JSON. Remove the parallel
handwritten instruction array. Field descriptions remain in the authoritative
schemas; the document is the sole maintained prose prompt. No runtime network
fetch, provider-specific instructions in Result, or browser filesystem dependency
is introduced. An actual Gemini-request regression reads the document independently
from disk and compares the full prompt, so partial copying or stale instructions
fail the test.

The user clarified that absent source information is an allowed unknown rather
than a demand to complete a trip. The prompt preserves source expressions and
names verbatim, avoids unsupported flight/Day bindings, and uses non-blocking
findings for safely retained uncertainty. It does not demand airline, flight
number, year, or accommodation information absent from the source. This supersedes
any earlier interpretation of sections 7–8 that treated absent information alone
as failed fidelity or mandatory completion. Historical 9/15 assessments remain
historical, not current acceptance scores. No existing recorded output is changed
or retroactively declared passing. Application confirmation prerequisites are
not altered by this prompt-integration change; unresolved requirements there
must not be misreported as model-supplied facts.

## Risks / Trade-offs

- [Gemini may still fail to honor a large or deeply nested supported schema] → Keep strict local validation, add generated-schema fixtures, run the live benchmark, and fail visibly without mutating the active trip.
- [Provider projection can drift from the strict local schema] → Derive definitions and descriptions from the authoritative interpretation schemas, account for omitted constraints, and test both schemas. Their accepted-value sets need not be identical; the known difference must not silently lose guidance.
- [Descriptions improve adherence without guaranteeing it] → Keep strict rejection, inspect original live outputs for unsupported precision, and do not use a format-only repair as semantic acceptance.
- [A generic `行程讀取失敗` heading may hide actionable distinctions] → Keep the heading stable but provide phase-specific safe body copy and retry/replacement actions.
- [Focus restoration can race with MUI Dialog focus restoration] → Implement focus at the owning intake state transition and verify the final focused alert in real browsers.
- [Captured provider material may contain sensitive or excessive metadata] → Sanitize to the minimal malformed interpretation shape or keep the capture outside the repository; never commit credentials, thought signatures, or full raw production envelopes.

## Migration Plan

1. Add failing provider-projection and captured-response regression tests.
2. Reshape only the Gemini response projection and rerun deterministic parser tests.
3. Add the provider-neutral failure descriptor and map existing workflow failures without changing persistence or CanonicalTrip contracts.
4. Implement the focused Home failure state and recovery actions, then run mobile and desktop browser tests.
5. Add constraint descriptions, uncertainty instructions, and bounded per-level benchmark outcomes with focused regressions.
6. Run External Markdown Benchmark #001 with the acceptance candidate, assess original outputs, and separately verify Review confirmation/rendering before any production model decision.

Rollback is a source revert of the projection and recovery UI. No persisted schema or data migration is introduced, so the current confirmed trip and browser-local credential remain compatible.

## Open Questions

- Whether the sanitized malformed interpretation should live as a permanent benchmark fixture or as a smaller synthetic unit fixture will be decided during implementation based on benchmark retention rules.
- Production model pinning remains gated by the existing live benchmark and is not decided by this change.
