# External Markdown Benchmark #001 live comparison

This directory contains the explicitly sanitized Sample #23 acceptance fixture.
It is not a store for production uploads or ReviewSession data.

Run only with authorization to use a locally available credential:

```sh
node --env-file=.env node_modules/vitest/vitest.mjs run --config vitest.benchmark.config.ts
```

The dedicated command does not otherwise load `.env` automatically. The runner
uses `GEMINI_API_KEY`; never put its value in command arguments or artifact files.
`EXTERNAL_MARKDOWN_BENCHMARK_OUTPUT` optionally selects an absolute output path.
The default is `external-markdown-001-live-comparison.json` in Node's OS temporary
directory. The live test atomically saves mode-0600 checkpoints before calling
`assertLiveBenchmarkExecution`, including failed and incomplete comparisons.

The exact candidate is `gemini-3.8-flash`. Low, medium, and high run in order with
no additional benchmark retries. A level-specific parser/validation error keeps
its allowlisted failure code, phase, safe HTTP status, and bounded safe diagnostics;
remaining comparisons continue. Authentication failure, source/preflight setup
failure, explicit abort, or parser construction failure stops further calls.
Earlier outcomes remain and unattempted levels are explicitly `not_run`.
Missing credentials or an invalid fixture mapping produce a setup failure artifact.
An unwritable output path remains a filesystem failure; the runner does not bypass
that path or silently claim it saved evidence.

The live test allows up to 1,120 seconds before abort, with a 1,140-second outer
test timeout to save terminal outcomes. This accommodates all three levels and
the existing maximum of three 120-second transport attempts per level; it does
not expand provider retry policy. SIGINT/SIGTERM requests cancellation. Each
completed level is saved before the next request, so earlier results also survive
an external termination that cannot finish cleanup.

`external-markdown-live-comparison.v3` distinguishes execution from acceptance
and records `faithful-markdown-rubric.v2` explicitly:

- `runs` always includes all three thinking levels as `succeeded`, `failed`, or
  `not_run`. Any failed/not-run outcome fails the aggregate execution assertion.
- Successful collection has `acceptance_status: pending`. It is not the model
  acceptance gate, even when every level returns a schema-valid result.
- A successful level retains `original_interpretation`, a full interpretation of
  this sanitized fixture, plus its compact summary and annotation mapping. No
  credential, thought signature, provider envelope, or production session belongs
  here. Text/collection bounds, a 150 KB per-level bound, 20-diagnostic bound, and
  512 KB overall formatted JSON bound keep artifacts finite; an oversized result
  becomes a failed level without deleting completed outcomes.
- `human_review` records judgments about the original pre-Review interpretation.
  `evaluateOriginalParserQuality` returns pending until every expected ambiguity
  representation and every rubric-required finding is assessed; faithfully
  represented `not_required` findings may remain absent. Any missing/invented
  critical event, unsupported exact fact, failed representation, or missing
  required finding fails original parser quality. Its result does not establish
  that a Reviewable Draft or confirmed CanonicalTrip exists.
- `review_recovery` records corrections and separate authoritative confirmation,
  persistence, and mobile/desktop Viewer evidence. It must never overwrite the
  original interpretation or turn failed original parser quality into a pass.

## Faithful Markdown rubric v2

`benchmark.json` pins `faithful-markdown-rubric.v2`. Each of the original 15
annotations remains in place and now declares its fidelity classification,
expected representation and finding requirement. Historical 9/15
completeness-oriented assessments remain historical evidence; they are not
renamed or reused as v2 fidelity scores.

The v2 classifications are:

- `preserved_known`: supported meaning and relationships are retained.
- `preserved_unknown`: source-absent facts stay absent without compulsory user
  completion; a warning is not required unless the annotation says otherwise.
- `explained_ambiguity`: the supplied raw expression stays readable without
  inferred precision; annotations marked `required` need a focused,
  non-blocking Review finding.
- `mixed_unknown_and_ambiguity`: absence and supplied ambiguity are scored
  independently according to the annotation's explicit requirement.
- Unsupported inventions and semantic omissions are failures, even when schema,
  confidence and source coverage pass.

For `conditional` findings, the representation must itself make the unresolved
state explicit; otherwise a focused finding is required. A faithful null is not
an omission. A finding cannot compensate for dropped meaning, changed
proper-name characters, an inferred exact fact or a flattened relationship.

A failing aggregate comparison does not invent a requirement that every thinking
level must pass semantic acceptance. Selection still uses the existing exact-model
gate, with every failed/not-run comparison kept visible. Production has no accepted
default, and Hosted Delivery stays gated until that full acceptance evidence exists.
