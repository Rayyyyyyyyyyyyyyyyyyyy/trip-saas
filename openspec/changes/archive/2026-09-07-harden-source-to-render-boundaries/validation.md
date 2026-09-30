# Boundary hardening validation

## Review of the inherited work — 2026-09-07

Baseline: `f7726c1cb678c1d8aad96e17e857ed56cbcc2434` plus the existing working-tree
changes and new source-domain/test files. The review covers completed tasks 1–4;
acknowledged pending tasks 5–8 were not treated as introduced review defects.

### Standards

- **P2 — inaccessible long evidence:** the source projection discarded text
  after character 4,000 with no way to inspect the rest. A long Markdown table
  could therefore send booking details to interpretation but hide them during
  Review. Fixed by preserving every character in bounded consecutive excerpts.

### Spec

- **P2 — inaccessible long evidence:** the same defect violated the existing
  original-text treatment. This is the same issue as the Standards finding.
- **P3 — missing context:** directly referenced Markdown items and dormant tabular
  cells omitted their parent/header context despite task 4.2. Fixed by projecting
  the immediate parent and header references before each item and deduplicating
  repeated evidence within a selection. Source-specific structures remain out of
  Review components.

The new regression tests failed before the fixes: the last booking row was
missing, the Markdown day heading was absent, and the tabular time header was
absent. After the fixes, 14 focused component tests and all four desktop/mobile
Review browser cases passed. Browser assertions cover console errors and page
overflow; the long-table case verifies booking information after the old cap.
The production build and `git diff --check` passed. The build reports its existing
large-chunk warning; no deployment was performed.

## Explicit sample routing

Task 8 routes Golden capabilities using the existing explicit `sample` state.
A component regression first reproduced replacement of a persisted Golden-ID
trip by the bundled data, then passed after the branch was changed. The browser
regression verifies Canonical JSON import, reload, sample preview, and returning
to the actual supplied trip without replacing it. The focused Golden browser
suite passed 21 cases across desktop/mobile, with one expected desktop skip for
a mobile-only control-size case. It covers Tokyo-time behavior, static fallback,
checklist/reservation synchronization, exact Maps/Tabelog URLs, navigation, and
mobile targets. The new routing case checks console/page errors and overflow.

## Integrated implementation

- Task 5: `interpretTrip` requires a validated source brand and owns preflight,
  response schema, coverage and Reviewable Draft policy. Gemini transport owns
  envelopes, the exact configured endpoint, header authentication, bounded retry,
  deadlines and cancellation. The legacy parser factory remains a validating
  composition boundary. No output policy is duplicated in Startup or transport.
  A transport that ignores abort cannot keep its request/body wait pending;
  cancellation/deadline tests assert that timers are cleared. Diagnostic failures
  cannot replace bounded parser failures.
- Task 6: the application owns all six processing stages and overall deadlines,
  with an explicit stop action. Stage waits race cancellation even when the
  dependency ignores its signal. Reducer terminal-state guards reject late
  processing events. Stop/failure preserve selected source and active truth;
  successful confirmation/JSON import and explicit local clearing discard raw
  input. Candidate source/evidence do not cross the confirmed persistence boundary.
- Task 7: the shared placement policy drives authoritative validation and a
  recursive Day display tree. Contained groups nest, crossing/equal ownership and
  impossible sequence order block confirmation, parents precede their programs,
  optional items remain separate, and relationship members keep their full
  supported semantics/actions. Fixed-anchor and Overview summaries are compact
  references rather than duplicate primary entities.

### Aggregate checks

- `npm run test:unit`: **283 tests / 42 files passed**, including source-contract,
  interpreter/transport, deterministic External Markdown Benchmark #001, schema
  projection, workflow, placement, semantic fixtures and architecture checks.
- `npm run test:component`: **68 tests / 10 files passed**.
- Lifecycle Playwright suite: **18 desktop/mobile cases passed**, covering all six
  stalled stages, explicit stop, ignored late success, malformed source with zero
  provider calls, provider timeout, preserved input/active trip, console errors
  and horizontal overflow.
- Existing Review/intake Playwright suites after integration: **8 cases passed**,
  including complete long evidence, provider/output recovery and confirmation
  persistence. Subsequent confirmation cleanup assertions passed in all six
  focused workflow component cases.
- Result Playwright suite: **6 cases passed**, including nested unique placement,
  optional separation, complete dependency details/actions, transport treatment,
  console errors and overflow.
- Final Golden/routing rerun after integration: **21 cases passed, 1 expected
  desktop skip** for the mobile-only target-size test. Together these focused
  desktop/mobile browser suites passed **53 cases**, with one expected skip.
- Final `npm run build` (including typecheck), `git diff --check`, and
  `openspec validate harden-source-to-render-boundaries --strict`: **passed**.
  The production bundle retains the reported large-chunk warning.

The change is **59/60 tasks complete**. Only the real-provider acceptance gate
10.5 remains unchecked; do not archive the change or activate the default based
on these local results.

Final diff inspection found no new runtime dependency, persistent source/provider
payload, credential marker, provider/source imports reaching Result components,
spreadsheet intake enablement, model alias/fallback, or production-default
activation. User-owned tooling/research directories remain uncommitted and outside
the implementation scope. The scans and mock fixtures do not establish live
provider behavior.

## External acceptance boundary

The initial sub-agent invocation did not load `.env` and exited at
`credential_missing` before a provider call. That was a command-loading issue,
not evidence that this workspace lacked a key.

On 2026-09-07 the user explicitly authorized using the existing `.env` credential
and fixture. Running Node with `--env-file=.env` reached the exact
`gemini-3.5-flash` candidate. The live comparison failed at low thinking; medium
and high were not reached. Two bounded diagnostic reproductions isolated a
response-stage `invalid_response` / `SCHEMA_INVALID`, rather than a missing
credential or connectivity failure. Offline validation of the captured sanitized
fixture response found invalid time strings and relative image URLs in fields
requiring HH:mm-or-null and HTTPS-or-null respectively. The response did not enter
Review; semantic acceptance and confirmed rendering remain unverified.

The runner currently wraps parser failures as `provider_unreachable`, which
obscured this distinction. Temporary diagnostic test/config files were removed.
The sanitized fixture response remains only in local temporary storage; no key
was printed or recorded. Task 10.5 remains unchecked, and the production model
default remains unaccepted. No commit, push or deployment was performed.


## Follow-up field guidance and live evidence

The approved `fix-gemini-schema-failure-recovery` extension implemented field
constraint guidance, raw-time preservation, and bounded benchmark outcomes.
See `../2026-09-07-fix-gemini-schema-failure-recovery/validation.md` for the decisive tests
and post-fix live assessment. All thinking levels were attempted: low failed the
Reviewable Draft gate; medium/high passed local gates but each surfaced only
9/15 annotated ambiguities fully. Task 10.5 remains unaccepted; local implementation
completion does not establish the external acceptance gate.
