# Field guidance and benchmark recovery validation

## Baseline and authorization

This extends the already locally verified direct-draft schema and intake recovery
work; it does not replace that work. On 2026-09-07 the user approved the extension
and requested sub-agent implementation. The user also authorized the existing
`.env` credential and sanitized Sample #23 for real Gemini testing. No key is
recorded here, no commit/push/deployment was requested, and the model default
remains gated.

The pre-fix live run failed at low thinking. Offline replay passed the generated
schema but failed the authoritative schema at 12 seconds-valued time fields and
two relative asset URLs. The same original output assigned unsupported evening
times without findings. The prior command-loading mistake (`credential_missing`
without loading `.env`) is not a current credential blocker.

## Implementation evidence

- Tasks 6.1–6.5: field descriptions and provider-neutral uncertainty instructions;
  omission inventory in `src/domain/trip/README.md`. New tests initially failed
  for missing omitted-constraint guidance and missing HH:mm in the real request.
  After correction, 89 related tests across seven files passed. Removing only
  descriptions from the schemas reproduces their original accepted contracts.
  Valid null-date/ambiguous-time/missing-asset fixtures enter Review; unresolved
  findings survive unrelated edits, confirmation needs date correction, and raw
  time/asset evidence survives explicit resolution and confirmation. Malformed
  seconds/relative URLs are still rejected with one request and no coercion.
- Tasks 7.1–7.3: bounded per-level benchmark outcomes, faithful safe errors,
  partial checkpoints, separate execution and semantic acceptance, and original
  interpretations separate from Review recovery. Nine new regressions were red;
  after implementation, 16 related unit tests passed. Sub-agents made no live
  provider calls.
- Root integration reproduced a Review date defect: correcting then clearing an
  unknown day date produced `SCHEMA_INVALID`. The UI now maps empty input to null
  and null to an empty controlled value. Eight Review component tests and six
  mobile/desktop Review browser cases passed, with console/overflow assertions.
- Existing executable schemas already allow null day dates and `review` severity;
  TypeScript declarations were aligned to those accepted values. Result date
  formatting now handles an unknown day without inventing a date.
- User steering explicitly requires original clock expressions to remain visible.
  Prompt now says to copy the expression verbatim; Result projection must retain
  raw time for untimed/ambiguous values without creating a known runtime start.

## Integrated and external verification

- First integrated unit run: 298 tests / 43 files passed.
- First integrated component run: 69 tests / 10 files passed.
- These runs precede the final raw-time Result regression; final affected checks
  and production build will be recorded below.
- Final affected projection/time/guidance rerun: 25 tests / three files passed.
- Final integrated Review/Result/Golden browser run: 28 cases passed across
  mobile/desktop, including original `8點` display, null dates, no invented
  08:00/20:00 or fixed anchor, preserved source, Tokyo runtime and sample routing.
- Production build and typecheck passed. Vite retains its large-chunk warning
  (886.77 KB minified, 268.77 KB gzip); no bundle optimization was in scope.
- Strict validation of both changes and `git diff --check` passed.

## Post-fix live comparison — failed acceptance

Command: `node --env-file=.env node_modules/vitest/vitest.mjs run --config vitest.benchmark.config.ts`.
The run completed in approximately 197 seconds against exact `gemini-3.5-flash`.
The runner correctly saved all three outcomes before failing its aggregate check:

| Thinking | Execution | Original semantic acceptance |
| --- | --- | --- |
| low | `draft_not_reviewable` at `review_gate` | Failed local gate; no accepted original retained |
| medium | Schema, coverage, Reviewable Draft passed | Failed annotated ambiguity preservation |
| high | Schema, coverage, Reviewable Draft passed | Failed annotated ambiguity preservation |

Permitted sanitized fixture artifact: `temp/validation/external-markdown-001-post-guidance.json`
(relative to repository root). It contains original interpretations, not a raw
provider envelope. A credential-substring guard passed before retention. Its
embedded human-review fields remain the runner's initial pending template; the
completed manual assessment is recorded below, independently of original data.

Medium and high both retain raw `8點` / `七點`, null exact clocks, focused time
findings, and unresolved assets with null URLs. Neither is a full parser pass.
All seven annotated critical intents are present and no invented critical event
was observed in either original. None of the six enumerated unsupported-exact
constraints was violated, but both assign outbound/return flights to first/last
Day without surfacing absent row-level dates. That additional unsupported Day
association is not hidden by the six-constraint count.

### Annotated ambiguity assessment

A partial item is counted as not fully surfaced. Preserved cross-midnight,
intentionally flexible meals and related exit guidance do not need an extra
warning solely to count; alternatives must retain the relationship semantics
required by the existing contract, rather than only a flattened title.

| Annotation | Medium | High | Evidence or missing distinction |
| --- | --- | --- | --- |
| 001 missing year | pass | pass | null dates plus missing-year finding |
| 002 incomplete flight identity and row dates | fail | fail | no focused finding; first/last Day assigned |
| 003 cross-midnight return | pass | pass | 23:00–00:35 and crosses_midnight=true |
| 004 unclear meaning of 424 | fail | fail | raw token retained but meaning uncertainty not focused for Review; generic place flag in high is insufficient |
| 005 unavailable relative images | pass | pass | preserved unresolved assets, null URLs and findings |
| 006 6:30 and unnamed accommodation | partial/fail | partial/fail | time finding exists; missing accommodation identity not focused |
| 007 mixed 5.30 / 8點 | pass | pass | raw values, null exact clocks, linked findings |
| 008 late-meal alternative | fail | pass | medium flattens options into one place; high has two entities and alternative relationship |
| 009 deliberately vague dinner | pass | pass | flexible dinner intent retained |
| 010 tentative Itaewon versus room | fail | fail | optional/tentative flags, but alternatives still flattened into one entity |
| 011 11.30 without explicit meridiem | pass | fail | medium raw-only plus finding; high exact 11:30 without finding |
| 012 unspecified lunch | pass | pass | flexible lunch intent retained |
| 013 address-first medical appointment | fail | fail | exact address preserved, missing clinic identity/time not focused |
| 014 blockquote-like station guidance | pass | pass | exit guidance attached to medical entity notes |
| 015 七點 without explicit meridiem | pass | pass | raw value, null exact clock, linked finding |

Both assessments yield 9/15 fully surfaced annotations (60%). Medium was assessed
independently by a sub-agent; root assessed high against the same criteria.
Some non-critical Korean place/title text is also changed to mixed scripts.
Medium preserves an intermediate station only in raw place text, which is not
carried to Canonical; final route rendering cannot be inferred from that raw
preservation. Unknown-place flags alone do not prove focused Review findings.

Task 8.3 is complete as execution plus assessment, not acceptance. Tasks 5.3 and
8.4 remain open: neither successful local candidate met original-output semantic
criteria, so a qualifying live-result Review/Canonical/rendering acceptance run
was not performed. Existing mocked browser confirmation tests are not substituted
for that evidence. The shared hardening task 10.5 remains gated, the production
default stays unaccepted, and no additional charged retry was made merely to seek
a passing sample. The completeness-based interpretation in this historical
assessment is superseded by the user's fidelity instruction below; it is not
a current requirement to generate missing identity/date findings.

## Executable prompt integration — 2026-09-07

The user explicitly requested using `spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md`
as the prompt, and clarified that source-absent information must remain absent,
without invention or compulsory completion. The former 9/15 count includes
completeness-based failures and must not be reused as the current fidelity score.

`src/app/interpretTrip.ts` now imports the entire maintained document with Vite
`?raw`, appending validated source JSON. There is no parallel handwritten prompt
array or runtime document fetch. Response schema descriptions still own field
format guidance. The actual-request regression independently reads the file and
asserts exact prompt equality: red before integration, green after it.

Verification:

- 55 focused interpreter/schema/transport tests passed, followed by all 299 unit
  tests in 43 files.
- Production typecheck and build passed; the existing 886.77 KB minified / 268.77 KB
  gzip main chunk warning remains outside this integration's scope.
- Ten Review/upload failure-recovery browser cases passed on desktop and mobile,
  including console and layout checks. These use controlled provider responses.
- Exact `gemini-3.5-flash` live comparison completed in 205 seconds using the
  authorized local credential and external Markdown fixture. Low failed with
  `draft_not_reviewable` at `review_gate`; medium and high passed local schema,
  coverage and Reviewable Draft checks. The aggregate execution assertion failed.

Sanitized original fixture interpretations are retained separately at
`temp/validation/external-markdown-001-integrated-prompt.json`; a credential
substring guard passed before retention. The artifact's initial human-review
template remains pending; the following observations are a targeted manual
fidelity assessment, not full benchmark acceptance or a revised 15-item score.

- Both successful drafts preserve both distinct alternative relationships
  (late meal and Itaewon versus room), null full dates, raw `8點` and `七點`,
  null exact clocks for those expressions, and unresolved image assets with null
  URLs. Missing source facts are not counted as omissions. All emitted findings
  are non-blocking.
- Medium leaves both flight Day bindings null. High still assigns first/last
  Day without source-supported flight row dates and infers evening dayparts for
  ambiguous clocks; its finding explicitly mentions inferred dayparts. This is
  not proof of compliance with the non-invention instruction.
- Both still alter proper-name characters in entity titles. Medium changes
  `혼고집 명동직영점` to `혼고집 명동직營店`; high changes `오츠커피 연남`
  to `오茨커피 연남`. Correct place fields do not repair the changed title.
- Route text through Seoul station survives in canonical-bound title/notes in
  the successful drafts, improving the prior raw-place-only preservation.

Prompt integration task 9.3 is complete as implementation plus verification.
Full original-output semantic acceptance and real-result Review/confirmation/
rendering acceptance remain unproven (tasks 5.3, 8.4 and shared hardening 10.5).
The existing confirmation prerequisite for full trip start/end dates was not
changed by this prompt integration; null date handling in Draft is not evidence
of date-free final confirmation. Production model default remains unaccepted.
