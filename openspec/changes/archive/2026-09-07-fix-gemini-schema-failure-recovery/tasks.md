> Archived 2026-09-07: completed work retained; unchecked tasks transferred, not passed. See [closure](./closure.md) and [successor handoff](../../complete-faithful-markdown-journey/handoff.md).

## 1. Establish the regression baseline

- [x] 1.1 Add a sanitized, minimal fixture for the malformed summary-shaped Gemini interpretation response. Exclude credentials, thought signatures, raw source content, and provider response metadata.
- [x] 1.2 Add parser replay coverage proving the malformed response is rejected before Review and cannot replace the confirmed trip.
- [x] 1.3 Add failing schema-projection tests requiring `properties.draft` to directly constrain the value to a complete `ParsedTripDraft` or `null`, accept valid draft and insufficient-result fixtures, and reject the summary-shaped fixture.
- [x] 1.4 Add failing component and browser characterization for a read failure: the blocking dialog closes, `行程讀取失敗` is visible, the selected source and active trip remain intact, and focus moves to the alert.

## 2. Correct the Gemini response-schema projection

- [x] 2.1 Refactor `createGeminiSchemaProjection` so the provider-facing `draft` property directly uses `anyOf` with the complete draft reference and `null`, without depending on a top-level conditional branch to constrain the draft shape.
- [x] 2.2 Preserve the strict provider-neutral local schemas and the existing validation order: response schema validation, semantic coverage validation, and pre-Review gate validation.
- [x] 2.3 Verify the projected schema uses Gemini-supported structured-output keywords and remains within the existing request-size preflight limit.
- [x] 2.4 Extend adapter tests for valid draft, insufficient result, schema-invalid response, coverage-invalid response, and gate-invalid response; prove invalid results never enter Review or persistence.

## 3. Model safe intake failures

- [x] 3.1 Define a provider-neutral, bounded intake failure descriptor covering reading, extraction, provider request, provider response validation, pre-Review validation, and unknown failures.
- [x] 3.2 Map source, Gemini adapter, and workflow failures to safe user-facing messages without exposing arbitrary thrown messages, API credentials, raw provider responses, or schema paths.
- [x] 3.3 Preserve the uploaded file or pasted Markdown and the current confirmed trip when intake fails.
- [x] 3.4 Clear stale failure state when the user edits, replaces, or removes the source, changes intake mode, or starts a fresh retry.

## 4. Add the failure recovery experience

- [x] 4.1 After the blocking reading dialog closes on failure, render a `role="alert"` notice headed exactly `行程讀取失敗`, with a safe phase-specific explanation and confirmation that the current trip was not replaced.
- [x] 4.2 Provide explicit actions to retry the same preserved source and to replace or edit the source before trying again.
- [x] 4.3 Restore focus to the failure alert after the MUI dialog closes so the error is announced once and keyboard users land at the recovery point.
- [x] 4.4 Verify long localized filenames, long messages, mobile and desktop layouts, and ensure the full-screen interaction lock remains active until success or failure is finalized.

## 5. Verify the change

- [x] 5.1 Run focused unit and component tests, including malformed captured-response replay, source preservation, active-trip preservation, safe diagnostics, retry, and stale-error clearing.
- [x] 5.2 Run Playwright at mobile and desktop viewports with a malformed provider response; verify the blocking dialog, focused failure notice, preserved Home source, absence of Review navigation, and a clean browser console.
- [ ] 5.3 Complete the live External Markdown Benchmark #001 after the extension below, record original parser-quality and separate Review/Canonical evidence, and share that evidence with `harden-source-to-render-boundaries` task 10.5. The 2026-09-07 authorized run failed at low thinking; the gate remains open.
- [x] 5.4 Run `npm run build`, `git diff --check`, and `openspec validate fix-gemini-schema-failure-recovery --strict`; inspect the diff to ensure no raw captured material, secrets, or unrelated scope entered the change.

## 6. Preserve field constraints and uncertainty instructions

- [x] 6.1 Inventory constraints omitted from both interpretation schemas, including IDs, codes, dates, times, URLs, and string bounds; define guidance or an explicit local-only enforcement decision for each.
- [x] 6.2 Add failing projection tests for missing field guidance and unaccounted omitted constraints; retain minimal sanitized or synthetic regressions for seconds-valued times and relative asset URLs.
- [x] 6.3 Add descriptions to the authoritative schema nodes/shared definitions and preserve them through projection, without changing accepted values, schema versions, or strict local validators.
- [x] 6.4 Add application-owned instructions for ambiguous meridiem, missing years, missing relative assets, and absent action URLs using existing valid draft representations; keep benchmark answers out of prompts and add no automatic coercion/repair call.
- [x] 6.5 Verify the generated request carries the guidance, malformed replay is still rejected, and valid uncertainty/asset fixtures enter Review with raw evidence and focused findings. Check pending corrections and confirmation through existing Review policy.

## 7. Make benchmark failures and acceptance distinguishable

- [x] 7.1 Add failing comparison-runner tests for low-level validation failure followed by remaining comparisons, safe failure classification, credential/setup failure or abort, and preservation of completed/not-run outcomes.
- [x] 7.2 Implement bounded per-level outcomes and artifact writing before aggregate execution failure; retain only permitted sanitized benchmark data and existing safe diagnostic fields.
- [x] 7.3 Verify that successful execution with human review pending is not reported as acceptance, unsupported exact facts fail original parser quality, and corrections remain separate from original outputs.

## 8. Verify the extension and align current contracts

- [x] 8.1 Update `spec/03_PIPELINE_SPEC.md` and `spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md` in place with constraint guidance, valid uncertainty representations, and ownership; preserve evidence under `temp/` and current document references.
- [x] 8.2 Run focused projection/interpreter/benchmark regressions, relevant unit/component tests, production build, `git diff --check`, and strict OpenSpec validation; inspect for accidental coercion, leaked data, or model-default changes.
- [x] 8.3 Run the authorized exact `gemini-3.5-flash` live comparison with the fixture and locally loaded credential; assess original responses for critical omissions/inventions, unsupported exact facts, coverage, and every annotated ambiguity. Record each failed/not-run level without silently changing models.
- [ ] 8.4 For any candidate meeting the original-output acceptance criteria, separately exercise Review correction, authoritative confirmation, persistence, and existing Viewer rendering at mobile and desktop widths with console checks; complete task 5.3 and the shared external gate only when their required evidence exists.

## Verification notes

- Tasks 1–4 and 5.1/5.2/5.4 describe the locally verified original direct-draft and recovery work. Sections 6–8 are an approved specification extension, not implemented behavior; the earlier checks do not verify the extension.
- Deterministic parser guardrails previously passed through `tests/unit/external-markdown-benchmark.test.ts` and `tests/unit/external-markdown-live-comparison.test.ts`.
- The initial live-only invocation did not load `.env` and stopped at `credential_missing`. On 2026-09-07 the user authorized the existing key and fixture; loading `.env` reached exact `gemini-3.5-flash` and failed at low thinking with `invalid_response` / `SCHEMA_INVALID`. Medium/high were not reached. This is a failed external gate, not unavailable credentials.
- Offline replay passed the generated provider projection but failed the authoritative schema at 12 time fields and two relative asset URLs. The captured interpretation also silently mapped ambiguous clock expressions to exact evening times and emitted no findings. Formatting repairs alone do not establish semantic acceptance.
- No new live call, application implementation, or model-default activation is part of this specification update. The shared gate remains `../2026-09-07-harden-source-to-render-boundaries/tasks.md` task 10.5; earlier execution details are in `../2026-09-07-harden-source-to-render-boundaries/validation.md`.

- Post-extension live comparison completed all three levels: low failed the Reviewable Draft gate; medium/high passed schema, coverage, and Reviewable Draft checks but failed the full semantic acceptance assessment. See `validation.md`. Task 8.3 records execution and assessment, not acceptance; tasks 5.3 and 8.4 remain open.


## 9. Integrate the maintained prompt document (user follow-up)

- [x] 9.1 Replace the handwritten instruction array with a build-time raw import of `spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md` plus validated source JSON; incorporate the user's source-fidelity and non-completion instruction in that document.
- [x] 9.2 Reproduce the missing-document integration with an actual-request regression, then prove the transmitted prompt equals the independently read document and source; preserve source preflight and strict response gates.
- [x] 9.3 Verify the production build, affected parser/browser wiring and live benchmark; record current fidelity evidence without carrying forward historical completeness-based failure counts as current acceptance.
