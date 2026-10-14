# Review-led direction and predecessor handoff

Date: 2026-09-07; updated 2026-09-09. Status: active successor; local
implementation and regression verification are substantially complete, while
the sensitive-data-authorized live model gate, qualifying-original acceptance
and production-default activation remain open. This file is a transfer map, not
a completion certificate.

User direction: start from the full review, align work to the repository product
promise, consolidate completed predecessor work and transfer outstanding gates.
Archive means transferred scope, not semantic acceptance or completed V0.

## Product outcome

A real Markdown itinerary with unknown year, ambiguous raw times, alternatives,
undated travel information and source-provided actions can be faithfully
confirmed, persisted, reopened and completely read on mobile and desktop.
Source absence needs no compulsory completion. The Golden trip remains reliable.

## Eight inherited unchecked tasks

| Archived predecessor | Open task | Successor tasks | Gate meaning |
| --- | --- | --- | --- |
| build-trip-runtime-v0 | 9.7 | 1.1, 6.1, 6.3 | Versioned original parser comparison evidence |
| build-trip-runtime-v0 | 9.8 | 6.6 | Exact production activation remains blocked |
| build-trip-runtime-v0 | 14.2 | 6.3 | Final original parser-quality gate |
| build-trip-runtime-v0 | 14.3 | 6.4 | Qualifying original through confirmed mobile/desktop Result |
| build-trip-runtime-v0 | 14.4 | 6.5, 6.7 | Recovery/usability observations and limitations |
| harden-source-to-render-boundaries | 10.5 | 6.3, 6.4, 6.6 | Shared exact-model external gate and activation |
| fix-gemini-schema-failure-recovery | 5.3 | 6.3, 6.4 | Original quality and separate confirmed-result evidence |
| fix-gemini-schema-failure-recovery | 8.4 | 6.4, 6.5 | Qualifying live-result recovery and rendering |

Predecessor directories are under `../archive/2026-09-07-<name>/`, each with a
closure record. Their eight task checkboxes remain unchecked. Counts at transfer:
build 106/111, harden 59/60, fix 33/35. These counts must not be summed into a
product completion percentage. A failed comparison can satisfy execution-only
work, but it does not satisfy its acceptance or activation gate.

## Eight review categories

| Review category | Implementation / evidence owner |
| --- | --- |
| 1. Unknown dates blocked at confirmation | 1.2, 1.4, 2.3, 3.4, 6.4 |
| 2. Null-Day entity loss | 1.4, 3.1–3.4, 6.4 |
| 3. Canonical semantic validation gap | 1.4, 2.1, 2.2, 2.5 |
| 4. CSP / actual deployment mismatch | 5.1–5.3 |
| 5. Live fidelity and recovery not accepted | 4.1–4.4, 6.2–6.6 |
| 6. Benchmark faithful-unknown rubric missing | 1.1, 6.1, 6.3, 7.2 |
| 7. Canonical source identity/locator absent | 1.3, 2.4, 2.5 |
| 8. Current document ownership/status drift | 7.1–7.3; entry links updated at transfer |

## Evidence retained

- [Full review](../../../temp/validation/full-document-review-2026-09-07.md)
  and its inventory describe 104 read text/contract files and explicit unread
  binary/reference limitations.
- [Root probes](../../../temp/validation/reviewer-root-probes-2026-09-07.md)
  reproduce unknown-date confirmation, null-Day projection loss and invalid
  Canonical import acceptance without writing production browser data.
- Sanitized original fixture outputs remain in
  `temp/validation/external-markdown-001-post-guidance.json` and
  `temp/validation/external-markdown-001-integrated-prompt.json` unchanged.
- The latest original low result failed `draft_not_reviewable`; medium/high
  passed local gates but still changed proper-name characters, and high inferred
  unsupported Day/daypart. The old 9/15 score used superseded completeness
  interpretation and is not the current acceptance result.
- Previous 299 unit / 10 focused browser / build evidence applies to its recorded
  checkout, not to future implementation. No live call occurs in this transfer.
- Production exact-model acceptance, final real-result acceptance and Hosted
  Delivery permission remain ungranted by evidence. Key availability was already
  authorized and is not the failure explanation. Never expose key values.

## Delta sync assessment at archive

- Build: four capability bodies already equal current main specs; its older
  Result delta predates the newspaper update. Do not overwrite current Result.
- Harden: all three capability bodies already equal main specs.
- Fix: two capability files have no main-spec counterpart. Preserve them in the
  archive and reconcile via successor 7.1, including stale adapter-owned gate
  wording; do not blindly promote them as current implementation truth.
- Archive without a blanket spec sync. The successor's seven delta files capture
  the new direction; they are planned contracts, not shipped behavior.

## First implementation slice

Start with 1.1–1.4 and 2.1–2.3, then 3.1–3.4. This establishes consistent unknown
and invalid-value semantics plus complete rendering before another full live
acceptance attempt. Provenance persistent changes follow the explicit 1.3
compatibility decision. Security work proceeds against the checked-in Netlify
static build/header entry. This does not authorize or enable the separately
gated Hosted Delivery Functions/Blob publication path.

## 2026-09-09 follow-up review transfer

A worktree-vs-HEAD two-axis review found eight follow-up issues. They remain
owned here rather than in a parallel active change:

| Axis | Finding | Resolution / open owner |
| --- | --- | --- |
| Standards | A second active change competed for implementation/acceptance ownership | Its proposal, design, tasks and deltas were folded into this change; the untracked parallel change was removed. |
| Standards | `candidate` ambiguously named prepared source, Review draft and model | `design.md` now uses `prepared source`, `ParsedTripDraft` and `candidate model` explicitly. |
| Spec | Missing-year safety checked only null full dates | Source-linked partial-date preservation is required; implementation and regression remain tasks 4.11–4.12. |
| Spec | Any non-empty clock `raw_text` could unblock Review | Verbatim equality with resolved source evidence is required; implementation and regression remain tasks 4.11–4.13. |
| Spec | A user correction could leave the superseded provider finding blocking | Explicit user-authored correction must reconcile the old finding after authoritative validation; task 4.12 remains open. |
| Spec | The production-model gate omitted required evidence | Generated-schema, deterministic, key-backed live and integrated gates are explicit here and remain governed by 6.3a–6.6. |
| Spec | `12:30` was treated as unconditionally ambiguous and also as legal 24-hour time | Only evidenced `12點` expands the marker detector unconditionally; contextual `12:30` and legal 24-hour negatives remain task 4.13. |
| Spec | Sample #26 PDF was present but uncatalogued | All 13 pages were inspected; `temp/02_INPUT_RESEARCH.md`, `spec/01_CANONICAL_CONTEXT.md` and `AGENTS.md` now record 26 formal samples without enabling PDF intake. |

Open implementation work is recorded in tasks 4.9–4.13. Documentation repair,
strict validation and eventual implementation evidence are tracked by 7.4; no
new checkbox is marked complete merely because the contracts were corrected.


## 2026-10-01 shared prepared-source retry follow-up

Task 4.10 was implemented as the shared prerequisite for `add-spreadsheet-intake-and-result-clarity` 5.2. One app-owned session-only prepared-source cache serves Markdown and honest spreadsheet metadata/document submissions. Unchanged downstream retries preserve input/source/evidence identities, use fresh session/request ownership and reload the credential. File/paste/mode/selection replacement, removal and explicit clearing invalidate reuse; pre-source-gate failure, stop, timeout and inactive late preparation cannot populate the cache. Actual prepared extraction and spreadsheet inspection have application extraction/reading deadlines respectively. Source metadata never fabricates a TextSourceInput.

The 22 prepared-source/inspection component cases and 12 reducer cases pass. The separate spec review found no P1/P2 in this seam; local browser spreadsheet retry verifies an identical source document with unchanged selection, different identity after selection edits, active-trip protection and reload. Full integrated verification is recorded in the spreadsheet change’s `validation.md`. This checks 4.10 only: 4.9 and 4.11–4.13 retain their existing completion status and live/model gates remain unpassed. No production default, commit, push or deployment is claimed.


## 2026-10-07 user-selected model follow-up

The user explicitly chose to retain exact `gemini-3.5-flash`, superseding the previously researched 3.8 candidate after reporting rate limiting/instability. The acceptance candidate constant, ignored local development model configuration, benchmark examples and current product contracts now use exact 3.5. Production remains without an accepted no-override default; no live request/key read, model fallback, retry-bound increase, commit, push or deployment occurred. Historical failed 3.5 comparisons and prior 3.8 selection records above are retained without relabeling. Task 6.3a in the Markdown owner now requires new schema/parser/live evidence for exact 3.5 on response v2; it remains unchecked.

The latest user rule prohibits browser verification without separate explicit authorization. This follow-up performs only non-browser tests/build/static checks; the October 1 browser evidence above is historical and is not a fresh verification claim.

## 2026-10-12 user-requested pause checkpoint

The user asked to pause at a checkpoint during implementation of 4.9 and
4.11–4.13. Stop here; do not resume implementation or acceptance work until the
user resumes it. Changes are saved in the working tree on `ft/spreadsheet-intake`,
based on pushed commit `14afe05`; this follow-up has not been committed or pushed.

Implemented but not accepted as a complete slice:

- 4.9: removed alternate-model environment/parser/controller/UI paths. Bounded
  transport retries keep the configured model, and manual retry reuses the
  prepared source with fresh request ownership and credentials. Its focused
  tests and independent code review passed.
- 4.11–4.12: added source-linked preservation predicates and a session-only
  user-correction sidecar; application confirmation rechecks Review findings
  before persistence. The sidecar does not enter CanonicalTrip or provider data.
- 4.13: added source-evidenced clock detection, including `12點`, contextual
  `12:30`, and explicit daypart handling. Two older fixtures were corrected to
  contain the clock evidence their assertions require.

Round-one independent Standards/Spec review found four open P2 issues. These
are the first work on resume; do not relax source checks or mark the slice done:

1. `reviewPreservation.ts`: a shared source paragraph containing two partial
   dates requires each individual Day label to preserve both dates. Aggregate
   faithful retained text within the shared source scope instead; regress with
   `8/16 京都，8/17 大阪` split into two unknown-year Days.
2. `clockExpression.ts`: explicit 24/12-hour context must take precedence over
   marker and zero-padding heuristics. Regress `24 小時制：12點集合` as unambiguous
   and `12-hour clock: 06:30集合，AM/PM未註明` as ambiguous.
3. Review has no editable `Day.label` or `time.raw_text` repair path even though
   the new gate requires them. Add a bounded source-backed repair action/input;
   a user must not need to invent a year to recover a missing partial-date label.
4. Explicit deletion of a misidentified entity leaves its provider clock
   finding permanently blocking. Track the exact user-deleted entity ID in
   session-only state and reconcile its obsolete finding; missing/forged scope
   must remain blocking.

Then run the second review round and final unit/component/build/strict checks,
update the current Review documentation and completion evidence, and reconcile
task checkboxes. Tasks 4.9/4.11/4.12/4.13/7.4 intentionally remain unchecked at
this pause. Exact `gemini-3.5-flash` remains selected; no live provider call/key
read, browser operation, production default activation, main merge or deployment
occurred. Live/integrated/human acceptance and Hosted Delivery remain gated.

See `validation.md` for the exact checkpoint verification and its limits.

## 2026-10-12 resumed implementation closure

The user resumed this checkpoint. Tasks 4.9 and 4.11–4.13 are now locally
implemented and reviewed; 7.4 records their closure. The earlier pause section
above is historical and no longer lists current open implementation defects.

All four initial P2 findings are corrected: partial-date retention is aggregated
within the same evidence unit; explicit 12/24-hour context precedes notation
heuristics; Review exposes bounded Day-label/raw-clock repairs; trusted exact-ID
deletion retires a removed entity's stale clock finding after validation.
Round two also closed raw-only repair approving untouched precision and provider
Trip-only scope excluding an invented Day year. Time correction authority is
field-specific and requires actual edits; year checks cover all date-bearing
targets related to the cited source and admit valid event scope. Generic
acknowledgement and provider provenance cannot create correction authority.

The 2026-09-09 eight follow-ups are accounted for here:

| Follow-up | Current disposition |
| --- | --- |
| Competing implementation owner | This change remains the sole Markdown acceptance owner. |
| Ambiguous candidate terminology | Prepared source / ParsedTripDraft / candidate model remain distinct. |
| Missing-year code-only safety | 4.11 checks source scope, preserved partial dates and every related full date. |
| Nonempty-clock code-only safety | 4.11 checks the actual cited clock token, raw preservation and absent precision. |
| Stale finding after user correction | 4.12 uses session-only, field-specific corrections and exact-ID deletion; confirmation recomputes findings. |
| Production-model evidence omitted | Exact 3.5 response-v2 schema/parser/live/integrated gates remain open in 6.3a–6.6. |
| Unconditional 12:30 ambiguity | 4.13 keeps contextual 12:30, explicit-format priority and legal 24-hour/daypart negatives. |
| Uncatalogued sample #26 | Existing 26-sample documentation is retained; PDF intake remains excluded. |

Next work is acceptance, not an automatic model activation or main merge:
6.3a exact `gemini-3.5-flash` current-pipeline live benchmark, 6.4 qualifying
original through confirmed/reloaded Result, 6.5 human usability evidence, and
6.6 conditional production-default activation. Spreadsheet three-layout live
acceptance/support declaration remains with its existing owner. Fresh browser
verification of these UI changes remains unperformed under the user's explicit
no-browser rule; it requires separate authorization for mobile/desktop input,
layout and console checks. No browser, provider request/key read, commit, push,
main merge or deployment was performed in this resumed implementation.

## 2026-10-14 commit checkpoint

The user requested committing this completed local slice and a progress report.
The implementation, regression tests and closure records above are included in
the requested commit on `ft/spreadsheet-intake`. `npm run build` passed again
on 2026-10-14, including generated validators/typecheck; the existing bundle-size
warning remains. The 591 unit / 123 component counts remain the 2026-10-12
verification, not new test runs. No push, main merge, deployment, live provider
request or browser verification is included in this commit-only request. The
remaining acceptance gates above remain open.
