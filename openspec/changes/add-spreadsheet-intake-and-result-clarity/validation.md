# Local implementation and review evidence

Date: 2026-10-01. Branch: `ft/spreadsheet-intake`, HEAD `90cfc28` plus the
uncommitted follow-up. This records local implementation evidence, not live
model acceptance or deployed behavior.

## Group 2 review

Fixed comparison base: `4596b56`; implementation commit: `9f4a4d8`. Review
was restricted to tasks 2.1–2.5, without reopening already reviewed Group 1.

| Axis | Round 1 | Round 2 |
| --- | --- | --- |
| Standards | One P2: a valid long Markdown heading became an uneditable Canonical confirmation blocker | No remaining high/medium findings |
| Spec | Same P2 violated carrying the source-derived group through confirmation | No remaining high/medium findings |

Reproduction: a heading exceeding 256 characters passes source validation and
Review draft validation, but its derived `group.label` failed Canonical v3.
The new regression failed before the fix. The label bound now matches the
validated source display-value limit of 200,000 characters, preserving the
trimmed heading verbatim. Authoritative Canonical validation and decoding pass;
both reviewers independently reran seven focused tests successfully.

Existing limitation recorded separately: trips containing only supporting
items and no Days have no reachable reference surface. This already exists at
the comparison base; it is not a Group 2 regression and was not expanded into
this follow-up's implementation scope.

## Group 3 implementation and review

Tasks 3.1–3.3 add `semantic-interpretation-result.v2` with optional
`coverage.block_disposition_ranges`. The required individual array may be
empty or mixed with ranges. Endpoints are inclusive in source document order,
and ranges cannot use `unparsed`.

Strict response-schema validation precedes bounded local expansion and the
existing response/fidelity/draft gates. Expansion rejects unknown endpoints,
reversed ranges, gaps and overlaps, produces individual coverage for Review
and scoring, and leaves the provider value unchanged. `coverage_invalid`
maps to fixed recoverable response-validation copy. Historical v1 schema and
captured artifacts remain unchanged and cannot satisfy a new v2 request.

The two review axes each passed round 1 with no high/medium findings. Reviewers
independently reran relevant deterministic suites (84 standards / 58 spec
tests). These overlapping counts are not added to the full-suite count.

## Group 4 source gate and review

The dependency-independent portion of 4.5 adds source input modes, excluded
sheet names, auxiliary typed hints and formula-cache findings, activates
tabular integrity checks, and provides a filename-independent exact-file plus
normalized-selection hash helper. Evidence and serialized-byte limits are
enforced without truncating the document. The helper is now consumed by the installed Spreadsheet Adapter; Home/Review integration is implemented in Group 5.

Both review axes found the same two P2 defects in round 1: locator checks
accepted an incorrect sheet prefix, and relabeling tabular evidence as Markdown
bypassed tabular integrity. Complete locators now match the verbatim sheet name
and A1 range, separately from opaque sheet identity; source format must match
all structural variants. Round 2 confirmed both fixes with no remaining
high/medium logic findings. It also found an existing synthetic grouping
fixture using inconsistent locators; those fixture locators now follow the
explicit convention without changing grouping assertions.

Regression cases assert that incorrect sheet locators, format relabeling,
reversed/out-of-bounds coordinates, inconsistent merges, overlapping regions,
sheet drift, excluded content and invalid headers cannot invoke Gemini.
Identity tests assert normalized selection, immutable caller input, distinct
file/scope identities and rejection of invalid selections. An initial test
table passed arrays as expanded Vitest arguments; a subagent reproduced and
fixed the test parameter shape, then all eight identity tests passed.

Tasks 4.1–4.8 are implemented. The user explicitly authorized official SheetJS CE 0.20.3 on 2026-10-01; package manifest and lockfile pin the official tarball and SHA-512 integrity. `npm audit` lists no `xlsx` advisory; overall audit still has two existing high findings (`fast-uri`, `undici`). Other dependency versions are unchanged.

### Adapter, missing-year Review, and whole-sheet reconciliation

XLSX extraction checks formatted numeric/text displays (including unquoted CJK date literals), 1900/1904 date systems, exact hyperlinks, cached formula zero/false/empty/error/missing states, merge anchors and covered content, large sparse ranges, hidden sheets and strict containers. CSV tests retain literal date/time/leading-zero/XML-looking values. Unsupported extensions, corrupt/renamed containers, size/sheet/evidence limits and empty sources fail explicitly. No formula executes.

Missing-year decisions are a local typed sidecar, derived from cited display text only; unsupported complete dates are cleared, while source month/day/weekday text and the existing Day theme remain readable. Round 1 found label/weekday loss; both review axes passed round 2 after the fix. Dedicated browser tests confirm and reload at desktop/mobile widths without persisting source or decision sidecars.

Whole-sheet preflight occurs for every chunk before the first provider call. Tests cover 19 sheets, oversized single-sheet zero-call rejection, stable original evidence identities, source-scoped entity IDs and rewritten references, supported date merges, separate unknown/unsupported Days, insufficient/failure/cancel/late results, global duplicate/gap coverage and conflicts. Both review axes found two P2 defects: early bound downgrades lost partial source dates, and provider-controlled finding prefixes could hide a blocking ambiguity. Each was fixed with a failing regression; both axes passed round 2.

### Real local extraction evidence

All eight local XLSX files were read in place, without a Gemini call. Only aggregate metrics were written to OS temp. These are desktop extraction/source-gate results, not mobile performance or semantic/live acceptance.

| Fixture | Visible sheets | Evidence units | Source bytes | Extraction/gate ms |
| --- | ---: | ---: | ---: | ---: |
| 清州 | 2 | 133 | 65,867 | 70 |
| 2024 韓國 | 7 | 1,176 | 596,542 | 213 |
| 澎湖 | 3 | 86 | 41,714 | 32 |
| 2025 釜山行 | 6 | 1,074 | 549,512 | 161 |
| 2017 自我放逐 | 19 | 4,317 | 2,190,514 | 96 |
| JP0107 | 10 | 229 | 130,494 | 397 |
| 名古屋 | 13 | 282 | 164,518 | 802 |
| Busan | 1 | 136 | 69,357 | 7 |


## Group 5 and shared workflow review

Both Group 5 review axes passed round 1 without P1/P2 findings. The shared prepared-source task 4.10 was implemented in `complete-faithful-markdown-journey` and separately reviewed clean. There is one workflow-owned memory cache, created only after source validation; downstream retries reuse source identity while creating fresh request ownership. File/paste/mode/selection edits invalidate it, and late inactive work cannot write it. Spreadsheet metadata inspection uses the same application deadlines and stop semantics, without provider work.

Synthetic XLSX/CSV browser flows passed on mobile and desktop: excluded-sheet cells never enter the provider request, no selection causes zero requests, unchanged retry retains exact source, changed scope changes identity, and confirmation/reload preserve only Canonical data. Sparse mini-grids keep wide-table scrolling inside their own surface. Review records selected scope, exclusions, unparsed count and bounded image findings without raw workbook/hint fallback. Missing source years stay unresolved and readable after reload. Console errors and document overflow are checked in these flows.

## Local benchmark runner review and preflight

The local runner defaults to prepare-only and performs no key read/provider send. Live mode requires explicit live authorization plus the exact configured candidate. It does not load credentials implicitly. Artifacts are locally bounded allowlist projections with restrictive permissions and safe atomic paths; production ReviewSession/raw source/provider envelopes are not saved. This tooling guard is not authorization for a live run in this chat.

Round 1 found two P2 defects: a self-reported ambiguity boolean could falsely pass without an actual finding, and arbitrary annotation fields could enter the artifact. Failing regressions were added before fixes. Scoring now requires actual finding IDs with matching source references; annotations are closed and validated at every level before artifact creation. Both review axes passed round 2; the 38 runner unit tests passed. Missing annotations/metrics stay pending, never zero or accepted. Parser quality remains separate from Review recovery.

The three real layout fixtures passed prepare-only adapter/source/request preflight. Original files were read in place; only allowlisted local artifacts were written to OS temp with mode 0600. No responses were collected.

| Fixture/layout | Evidence units | Request bytes | Estimated tokens | Result |
| --- | ---: | ---: | ---: | --- |
| Busan / row-per-event | 136 | 103,972 | 18,353 | Prepared; semantic rubric pending |
| 澎湖 / calendar grid | 86 | 74,003 | 12,431 | Prepared; semantic rubric pending |
| 名古屋 / column-per-day | 282 | 206,695 | 36,731 | Prepared; semantic rubric pending |

Preflight fits these selected sources into one request each; it cannot establish semantic quality or whether later region chunking is necessary. The 106,904,030-byte 名古屋 file passed the file cap locally; mobile memory/performance is not inferred.

## Current verification

| Check | Result |
| --- | --- |
| Final `npm run test:unit` | 510 passed across 56 files |
| Final `npm run test:component` | 114 passed across 13 files |
| Full browser suite, serial after Group 5 | 114 passed, 1 existing skip, 1 intermittent desktop Markdown Review failure |
| Final complete desktop diagnostic, unchanged logic | 48 passed, 1 existing skip; Review parity and Golden focus passed |
| Production-entry CSP + adapter lazy-load | 6 passed: Chrome, WebKit and mobile Chrome |
| `npm run build`, run by production-browser webServer | Passed, including validator generation/typecheck; existing chunk-size warning |
| `git diff --check` | Passed |
| `openspec validate add-spreadsheet-intake-and-result-clarity --strict` | Passed |

The original full-suite Review failure is retained as an unreproduced verification limitation. Its captured page unexpectedly had empty default file input. One original isolated run, five instrumented parity repeats, the full six-test Review spec and the final full desktop diagnostic all passed without production code/test timeout changes. Temporary navigation/Vite websocket/pageerror observers recorded only expected reloads, no spontaneous reload, page errors or Vite full-reload. No cause or production fix was established. Diagnostic log and traces remain in OS temp (`/tmp/review-parity-full-desktop.log`, `/tmp/review-parity-full-output`). Do not call the aggregate suite fully green.

Earlier checks are retained as historical evidence, not summed: Group 3 browser 107 passed/1 skip; Group 4 unit 467/component 83 and browser 108 passed/1 skip/1 WebKit failure (isolated WebKit three passed); first Group 5 browser 112 passed/1 skip/three failures (two stale guide assertions corrected, Golden isolated rerun six passed). Concurrent-load component timeouts did not reproduce separately; no timeout was relaxed.

Focused assertions include opaque non-numerically ordered IDs, inclusive and
singleton ranges, mixed individual/unparsed coverage, wrong totals, missing
unparsed reasons, local/provider schema parity, historical-version rejection,
and the actual request prompt. Existing source-invalid/no-provider and bounded
processing lifecycle tests remain green.

On both mobile and desktop Chromium, a valid mixed-range response confirms and
survives reload without persisting coverage/provider data. An overlapping
response exits the modal into a focused recoverable notice, retains the selected
source and retry action, and preserves the previously confirmed trip through
return and reload. These flows also check console errors and horizontal overflow.
Full regression includes Golden data/actions/checklist/Tokyo runtime, captured
Review recovery, and Chrome/WebKit storage/credential boundaries.

## Remaining gates

Task 3.4 remains open: the live exact-model Benchmark #001 comparison and
semantic assessment require the explicit authorization requested in this chat.
The user subsequently reported rate limiting and instability for
`gemini-3.8-flash`; candidate/stability resolution remains pending. This is
user-reported availability context, not a new measured parser-quality failure.
No live requests occurred for this evidence. SheetJS installation and all offline tasks are complete (30/33). Tasks 3.4, 6.2 and 6.3 remain open; spreadsheet support copy stays experimental. Final checks satisfy task 6.5’s execution/reporting requirement, with the browser limitation recorded above; they do not establish full acceptance. No production-default activation,
commit, push, deployment or Hosted Delivery implementation occurred.


## 2026-10-07 user-selected model follow-up

The user explicitly chose to retain exact `gemini-3.5-flash`, superseding the previously researched 3.8 candidate after reporting rate limiting/instability. The acceptance candidate constant, ignored local development model configuration, benchmark examples and current product contracts now use exact 3.5. Production remains without an accepted no-override default; no live request/key read, model fallback, retry-bound increase, commit, push or deployment occurred. Historical failed 3.5 comparisons and prior 3.8 selection records above are retained without relabeling. Task 6.3a in the Markdown owner now requires new schema/parser/live evidence for exact 3.5 on response v2; it remains unchecked.

The latest user rule prohibits browser verification without separate explicit authorization. This follow-up performs only non-browser tests/build/static checks; the October 1 browser evidence above is historical and is not a fresh verification claim.

Fresh non-browser checks for this follow-up: 91 focused tests passed across Gemini transport/parser and both benchmark runners; `npm run build` passed (generated validators/typecheck included; existing chunk-size warning); both active changes passed strict OpenSpec validation; `git diff --check` passed. The mocked transport regression confirms both attempts after a 429 request exact `gemini-3.5-flash`, with no substitution. Local development configuration was checked as exact 3.5 without reading/printing credentials. No live provider or browser verification was run.
