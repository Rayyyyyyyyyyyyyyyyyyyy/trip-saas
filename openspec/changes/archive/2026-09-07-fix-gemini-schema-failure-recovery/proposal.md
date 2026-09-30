## Why

The initial failure was a summary-shaped Gemini response caused by an unconstrained direct `draft` property, followed by an unclear return to Home. The direct-draft projection and visible failure recovery are now locally implemented.

The authorized 2026-09-07 live External Markdown Benchmark #001 exposed a remaining contract gap: the generated provider schema accepts the captured response while the authoritative local schema rejects 12 time fields containing seconds and two relative asset URLs. Projection removes `pattern` constraints without conveying their meaning through descriptions. The same response silently assigns exact evening times to ambiguous source expressions and emits no findings. Formatting success alone would therefore still fail semantic acceptance. The benchmark runner also masks parser validation failures as `provider_unreachable` and stops before comparing the remaining thinking levels.

## What Changes

- Replace the mechanically projected conditional Gemini response schema with a provider-safe shape that directly constrains `draft` as either a complete `ParsedTripDraft` or `null`, while retaining strict local schema, coverage, and Reviewable Draft validation.
- Add captured-response and generated-payload regression coverage so summary-shaped drafts cannot be treated as acceptable provider output and the provider schema cannot regress to an empty direct `draft` constraint.
- Describe time/date/identifier/code/URL constraints in the authoritative interpretation schemas and preserve those descriptions through provider projection; retain strict local validation.
- Define provider-neutral instructions for unknown dates, ambiguous clock times, and missing assets using existing raw-text, evidence, unresolved, and Review-finding fields without inventing precision.
- Add regressions for lost constraint guidance and distinguish schema success from faithful interpretation in the live benchmark; retain bounded outcomes per thinking level and truthful failure codes.
- Preserve the selected file or pasted Markdown after extraction, provider, schema, coverage, or Review-gate failure.
- After the blocking reading/interpretation screen closes on failure, return focus to a visible Home failure notice that explicitly says the trip could not be read, identifies the safe failure phase, confirms the active trip was not changed, and offers retry or source replacement.
- Keep sensitive provider details, credentials, raw responses, and schema diagnostics out of the user-visible message and durable storage.

## Capabilities

### New Capabilities

- `gemini-structured-interpretation`: Defines the provider-safe structured-output contract, deterministic local validation, and regression expectations for Gemini interpretation responses.
- `intake-failure-recovery`: Defines how the blocking intake screen exits on failure and how Home preserves source context, announces failure, restores focus, and exposes safe recovery actions.

### Modified Capabilities

None.

## Impact

- Authoritative interpretation-schema descriptions and application-owned interpretation instructions.
- Gemini schema projection and request construction under `src/integrations/gemini/`.
- Intake/workflow failure mapping under `src/app/TripRuntimeStartup.tsx` and `src/features/import/`.
- Focus management and the Home error presentation after a full-screen loading state.
- Unit, component, browser, and External Markdown Benchmark #001 regression coverage and comparison reporting.
- Existing change `harden-source-to-render-boundaries` task 10.5 continues to reference the same exact-model acceptance gate; this change does not activate the model.
- No CanonicalTrip schema, persistence format, provider registry, hosted delivery, PDF/Spreadsheet input, or production model-pinning change.
