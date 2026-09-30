# Validation and traceability

Date: 2026-09-08. This audit verifies implementation/evidence ownership and
records failed or unavailable gates explicitly. It does not turn a failed live
benchmark into acceptance.

## Delta requirement evidence

| Capability requirement | Implementation / verification evidence | Status |
| --- | --- | --- |
| deployed-static-security: CSP matches real static entry | `netlify.toml`, `public/_headers`, `index.html`, precompiled schema validators, CSP unit and production-browser tests; deployment report separates configuration from live response | local pass; Netlify response open |
| deployed-static-security: legitimate behavior preserved | production Chrome/WebKit/Pixel 7 load and allow/block checks | pass |
| deterministic-result-placement: ordered non-overlapping tree | `createTripPresentation`, shared placement validation, placement/component/browser suites | pass |
| deterministic-result-placement: complete across regions | undated/mixed relationship fixtures and generalized Result browser flow | pass |
| evidence-backed-trip-review: authoritative confirmation | shared Canonical validation, transactional repository tests, unknown-date and invalid-time confirmation tests | pass |
| evidence-backed-trip-review: effort observable | captured medium Review fixture records four scripted edits, two source-supported finding resolutions and time to confirmed reload at both viewports | automated evidence only; human burden open |
| faithful-markdown-acceptance: versioned scoring | rubric v2 fixture, scorer and unit tests, per-annotation historical replay | pass |
| faithful-markdown-acceptance: original vs recovery | immutable historical hashes, separate recovery fixture and bounded report | pass; latest original quality fails |
| faithful-markdown-acceptance: source-comparison usefulness | desktop/mobile address/action/reservation/alternative/optional/raw/undated scripted lookup timings | automated evidence only; human source-comparison open |
| faithful-markdown-acceptance: consolidation | three archive closures, unchecked predecessor tasks and successor handoff mapping | pass |
| faithful-markdown-acceptance: travel evidence boundaries | Golden/runtime/replacement suites and deployment/performance limitation report | pass within local scope; offline/travel unvalidated |
| local-canonical-trip: unknowns survive | Canonical v2, unknown-date confirmation/import/repository/browser reload and presentation tests | pass |
| local-canonical-trip: semantic trust entries | shared calendar/time/reference/relationship validation across confirm/import/read/write plus rollback tests | pass |
| local-canonical-trip: provenance compatibility | v2 allowlist, v1 decode/migration and storage-inspection tests | pass |
| trip-semantic-interpretation: absence vs conflict | executable prompt/schema guidance, fidelity gate, Review blocking policy and regressions | local pass; exact-model live output does not qualify |
| trip-semantic-interpretation: checks do not claim semantic proof | retained original artifacts, name/daypart regressions and rubric report distinguish schema, coverage and human assessment | pass |

## Eight review categories

| Review category | Evidence | Outcome |
| --- | --- | --- |
| unknown dates blocked at confirmation | unknown-date unit/component/browser confirmation and reload | corrected |
| null-Day entity loss | undated projection and browser lookup | corrected |
| Canonical semantic validation gap | shared trust-entry validator and rejection/rollback tests | corrected |
| CSP / deployment mismatch | Netlify build/publish configuration, response-header artifact and production-browser CSP plus explicit live-response gap | local correction; release gap retained |
| live fidelity and recovery | rubric replay, captured recovery, 2026-09-08 v3 live artifact | recovery proven; original/live acceptance failed |
| faithful-unknown rubric | rubric v2 annotations, scorer, live artifact version | corrected |
| source identity/locator absent | Canonical v2 provenance and v1 compatibility evidence | corrected |
| document ownership/status drift | synced main specs, current status docs and historical banners | corrected |

## Inherited open-task accounting

The eight predecessor tasks remain unchecked in their archives and map through
`handoff.md`. Their successor outcomes are:

- execution/scoring obligations map to completed 1.1, 6.1 and 6.3;
- controlled recovery obligations map to completed 4.4 and 6.7; human usability
  observations map to reopened 6.5;
- a qualifying original maps to open 6.4 because the latest live run produced no
  qualifying output;
- production activation maps to open 6.6 and remains forbidden.

## Structural checks

- `openspec validate complete-faithful-markdown-journey --strict`: pass.
- Local Markdown-link scan: 22 current README/context/spec/change files checked;
  no missing local targets.
- `git diff --check`: pass at the integrated verification checkpoint.

## 2026-09-08 code-review remediation

- Canonical authoritative validation now rejects an all-empty trip while
  admitting a meaningful undated-only draft.
- Canonical v2 provenance has one schema composition source; overridden field
  identifiers use the bounded stable-ID contract.
- The production fidelity gate no longer guesses proper names from arbitrary
  Hangul prose, and explicit daypart clocks do not receive ambiguity blockers.
  Proper-name fidelity remains a benchmark/human assessment obligation.
- Sequence identity and compact member references are projected and rendered in
  each dated/undated region without duplicating primary entities.
- Golden static deployment is explicitly Netlify; no deploy was performed and
  no Hosted Delivery service was enabled.

The traceability audit is complete. The change itself is not complete while
6.3a, 6.4, 6.5 and 6.6 remain open.

Remediation verification: 316 unit and 74 component tests passed; the isolated
Netlify production suite passed 4 with 2 expected non-mobile performance skips.
The full browser run on isolated ports passed 92 with 1 expected skip and one
transient WebKit dialog miss; the isolated WebKit rerun passed all 3 cases. The
production build, strict OpenSpec validation and `git diff --check` passed.

## 2026-09-08 next Gemini candidate

- First-party Google model, structured-output, thinking, pricing and lifecycle
  research is recorded in
  `temp/gemini-model-selection-research-2026-09-08.md`.
- Exact stable `gemini-3.8-flash` replaces `gemini-3.5-flash` as the next
  acceptance candidate; historical 3.5 outputs and failed scores remain intact.
- `GEMINI_ACCEPTANCE_CANDIDATE` and the live benchmark runner share that one
  exact ID. Local development opts in through ignored
  `.env.development.local`; no API key is stored there.
- A local Vite development probe exposed
  `VITE_GEMINI_MODEL=gemini-3.8-flash`; the production build contains neither
  the candidate ID nor the Gemini `generateContent` endpoint.
- Focused model/benchmark unit tests passed 26/26; the full unit suite passed
  316/316, typecheck and production build passed, and the strict OpenSpec and
  diff checks passed. No provider request was executed because this shell has no
  `GEMINI_API_KEY`.
- Netlify production configuration remains model-unset. New task 6.3a requires
  the complete schema, deterministic and authorized live comparison rerun before
  task 6.6 may activate a production default.
