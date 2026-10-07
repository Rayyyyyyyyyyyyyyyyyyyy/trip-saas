# Trip Runtime — Pipeline Contract
> Status: Architecture Contract
> Scope: Source → Confirmed CanonicalTrip → Renderable Trip.
## 1. Pipeline
```text
Source intake
→ Validate
→ Source Adapter
→ UnifiedSourceDocument
→ Executable Source-Document Gate
→ Semantic Interpreter
→ SemanticInterpretationResult
→ Required Response / Reviewable Draft Gates
→ ParsedTripDraft
→ Normalize
→ Reconcile
→ Deterministic Draft Validation
→ Review / Correct
→ [Later, optional: Resolve / Enrich approved intent]
→ Authoritative Candidate Validation
→ User Confirmation
→ Confirmed CanonicalTrip
→ Presentation Projection
→ Renderer
```
Post-V0:
```text
CanonicalTrip
→ PublishedTripSnapshot
→ TripPublication
→ Hosted Viewer
```
## 2. Core contracts
### Source Adapter
Input:
versioned `TextSourceInput`.

For Generalized V0 this may be:
- one Markdown file
- pasted Markdown text represented as an ephemeral source

Required normalized input fields:
```json
{
  "schema_version": "...",
  "source_id": "...",
  "input_mode": "markdown_file | pasted_markdown",
  "media_type": "text/markdown",
  "content": "...",
  "display_name": "..."
}
```

`content` must be non-empty after source validation. `display_name` may be generated for pasted input but remains required in the normalized envelope. File upload and paste differ only at intake; both continue through the same Source Adapter contract.
Output:
`UnifiedSourceDocument`.
Owns:
- source input reading
- extraction/reconstruction
- source locators
- assets/links/structural hints
Does not own:
- confirmed truth
- validation
- Review
- rendering
### UnifiedSourceDocument
Executable, versioned, source-neutral intermediate representation.
Must support:
- ordered evidence units with stable IDs
- hierarchy / structural role
- raw text/value
- locator
- links/assets
- extraction findings
- discriminated, schema-constrained source-specific structural evidence
Not CanonicalTrip.

Every Source Adapter output must pass both the `UnifiedSourceDocument` JSON
Schema and deterministic integrity checks before interpretation. The gate
validates source-ID agreement, unique evidence IDs, stable source order,
required locators, parent/header/reference integrity, hierarchy cycles, and
configured byte/token limits. Only the validated value is a legal Semantic
Interpreter input. Review receives a bounded evidence projection rather than
the document, Markdown AST, workbook objects, or adapter-private types.
### Semantic Interpreter
Input:
validated `UnifiedSourceDocument`.
Output:
versioned `SemanticInterpretationResult`, containing either a reviewable `ParsedTripDraft` or an explicit insufficient result.
Generalized Product V0 implementation:
- Gemini adapter only
- exact `gemini-3.5-flash` is the user-selected exact default candidate and becomes
  the production default only after its generated-schema, deterministic parser,
  and live External Markdown Benchmark #001 gates pass
- other provider/model adapters are later optimization scope
Owns:
- evidence-unit intent
- semantic classification
- relation interpretation
- uncertainty
Does not own:
- file extraction
- deterministic correctness
- user confirmation
- presentation

### Gemini V0 adapter decision (updated 2026-10-07)

On 2026-10-07 the user explicitly chose to retain exact `gemini-3.5-flash` after reporting `gemini-3.8-flash` rate limiting/instability. Existing failed 3.5 results remain historical; the current response-v2 gates must be rerun. This selection does not activate the production default.

Acceptance candidate:
- provider: Gemini only
- exact user-selected model ID: `gemini-3.5-flash`
- thinking level candidate: `medium`, subject to fixture-based latency/cost/quality
  comparison before pinning

Historical platform research constraints (2026-09-08; not newly verified for the user-selected model):
- 1,048,576 input-token limit and 65,536 output-token limit
- structured outputs supported, but only a subset of JSON Schema
- very large or deeply nested provider schemas may be rejected
- syntactically schema-shaped output still requires local semantic validation
- rate limits vary by model/tier and are enforced per Google project rather
  than guaranteed per individual key
- free-tier and paid-tier data-use terms differ, so the UI must disclose the
  selected Gemini tier's applicable handling before source transmission

Required adapter behavior:
- call token counting/preflight before sending a source near configured limits
- handle retryable `429 RESOURCE_EXHAUSTED` and `503 UNAVAILABLE` explicitly
  with bounded exponential backoff and no provider/model fallback
- retain the full product JSON Schema locally and compile only a
  Gemini-compatible structured-output projection for the API request
- do not pin `latest`, preview, or experimental aliases for production
- leave production without an accepted default until exact
  `gemini-3.5-flash` passes the required live benchmark; every later default
  change reruns the same gates

Historical official research sources (retained as research, not acceptance of `gemini-3.5-flash`):
- https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
- https://ai.google.dev/gemini-api/docs/troubleshooting
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/rate-limits
- https://ai.google.dev/gemini-api/docs/pricing

### Deep interpretation ownership

The application invokes one provider-neutral deep interface:

```text
interpretTrip(validated document, credential, cancellation signal)
→ ReviewCandidate | InsufficientResult | bounded failure
```

That module owns the ordered product-policy gates:

```text
validated source assertion
→ request size/token preflight
→ provider invocation
→ local response JSON Schema validation
→ source identity + complete coverage Gate A
→ Reviewable Draft Gate B
```

The Gemini adapter owns transport only: endpoint and exact model selection,
`x-goog-api-key`, request/response envelopes, HTTP translation, per-attempt
deadline, bounded `429`/`503` retry, cancellation, and extraction of the
structured JSON value. It must not own Reviewable Draft policy or return
provider-specific types through the application interface. The App must not
duplicate those gates.

### SemanticInterpretationResult
Provider-neutral response envelope. Required minimum shape:
```json
{
  "schema_version": "semantic-interpretation-result.v2",
  "source_schema_version": "unified-source-document.v1",
  "source_id": "...",
  "status": "draft | insufficient",
  "draft": null,
  "findings": [],
  "coverage": {
    "total_blocks": 0,
    "block_dispositions": [],
    "unparsed_items": []
  }
}
```

Required rules:
- `schema_version`, `source_id`, `status`, `draft`, `findings`, and `coverage` are always present
- `source_id` must match the input document
- `draft` is a `ParsedTripDraft` only when `status = draft`; otherwise it is `null`
- every validated evidence unit has exactly one `interpreted`, `supporting`, or `unparsed` disposition
- coverage totals equal the number of unique disposition source references
- each unparsed item contains a stable source locator, reason code, severity, and user-readable message
- schema-valid `insufficient` is a supported interpretation outcome, not malformed provider output
- malformed/schema-invalid provider output remains a parse failure and may be retried; it must not advance to Review or confirmation

When `status = draft`, the required `ParsedTripDraft` schema must include:
- trip identity + explicit trip date-range fields
- `days[]` with stable ID, explicit date, and source references
- `entities[]` with stable ID, day reference, semantic type, title/raw label, source references, and explicit time precision
- explicit optional/tentative/flexible/unresolved state fields
- preserved supporting/non-itinerary content references

Required fields must be present even when the supported value is `null`, `none`, `unknown`, or an empty list. Source absence is not automatically a parse defect: for example, an intentionally untimed item uses time precision `none`. Missing required schema members are parser-contract failures; source facts that cannot be interpreted safely become structured findings/unparsed items instead of invented values.

New requests use `semantic-interpretation-result.v2`, retaining serialized `total_blocks` / `block_dispositions` names. Optional `block_disposition_ranges` compress interpreted/supporting evidence using inclusive ordered IDs. Strict schema validation precedes bounded expansion; unknown/reversed endpoints, gaps and overlaps fail before response/fidelity/draft gates. Historical v1 responses remain historical benchmark evidence and cannot satisfy a new v2 request. At the
source-neutral boundary those fields are derived from evidence-unit identities;
they do not redefine all future evidence as Markdown blocks. Renaming the
serialized fields requires an explicit schema migration and rerunning the model
and benchmark gates.

### Normative LLM output schemas

The prose shape above is not the executable provider contract. Before any LLM
provider or new source format is enabled, implementation must define and freeze
two versioned JSON Schema artifacts:
- `semantic-interpretation-result.v2.schema.json` for the complete provider
  response envelope
- `parsed-trip-draft.v1.schema.json` for the non-null `draft` payload

Every current or future provider and supported source format must produce the
same schema-valid output. Markdown and spreadsheet input must not introduce
format-specific draft shapes. Format-specific evidence remains in
`UnifiedSourceDocument` and is referenced through stable `source_refs`; it does
not become a parallel CanonicalTrip model.

The schemas must:
- require every contract member and reject unknown members
- encode `draft | insufficient` as an explicit discriminated result
- require `draft` for `status = draft` and explicit `null` for
  `status = insufficient`
- enumerate supported entity, time-precision, state, finding-severity, coverage,
  and source-disposition values
- make nullability explicit rather than allowing omitted fields
- require stable IDs and valid internal/source references
- remain provider-neutral and exclude provider metadata

Recommended `ParsedTripDraft v1` field groups:
- `schema_version`
- `trip`: stable ID, title, explicit start/end date, timezone, geography, and
  source references
- `days[]`: stable ID, explicit date, source order, optional label, and source
  references
- `entities[]`: stable ID, nullable day reference, semantic type, title,
  nullable raw label, place, time, independent state flags, nullable
  reservation/ticket/readiness detail, notes, unresolved fields, confidence,
  and source references
- `relationships[]`: stable ID, relation type, member/parent/child references,
  and source references
- `supporting_items[]`: preserved non-itinerary material and source references

Recommended required value objects and enums:
- `semantic_type`: `flight | accommodation | transit | activity | restaurant |
  free_time | reservation | ticket | preparation | note | unknown`
- `time.kind`: `exact | approximate | range | daypart | none | open_ended`
- `time`: required `kind`, nullable `start`, nullable `end`, nullable `daypart`,
  nullable `raw_text`, and explicit `crosses_midnight`
- `state`: independent required booleans `optional`, `tentative`, and
  `flexible`, plus explicit `unresolved`
- `relationship.type`: `sequence | alternative | conditional | fallback |
  parent_child`
- readiness remains distinct from event completion; reservation, ticket, and
  readiness are nullable structured objects rather than one overloaded boolean

Recommended `Finding v1` fields:
- stable `id`
- `severity`: `error | warning | review | info`
- stable machine-readable `code`
- user-readable `message`
- explicit `blocking`
- `entity_refs[]` and `source_refs[]`

Recommended `Coverage v1` fields:
- `total_blocks`
- exactly one disposition per validated evidence unit; the v1 field name is retained for benchmark compatibility
- disposition enum `interpreted | supporting | unparsed`
- `unparsed_items[]`, each with stable source reference, reason code, severity,
  and message

Every object member above is required by the executable schema. Absence of a
source fact is represented by the declared `null`, `unknown`, `none`, `false`,
or empty-list value appropriate to that field, never by omitting the member.

The Gemini adapter must request structured output. Because Gemini supports only
a subset of JSON Schema and may reject very large/deep schemas, implementation
may compile a Gemini-compatible projection that preserves all required fields,
types, enums, and field descriptions while omitting unsupported validation
keywords. The authoritative interpretation schemas own descriptions for clock,
date, identifier, finding-code, and URL formats and their unknown-value handling.
Every omitted constraint must have accounted guidance or an explicit local-only
enforcement decision; projection tests must expose newly unaccounted omissions.
Descriptions guide generation but do not enforce correctness. The complete
product JSON Schema remains authoritative, and the same local deterministic
validator must reject non-conforming output before Gate A. The provider
projection may not introduce a different output model or silently coerce output.

The application-owned interpreter loads `TRIP_RUNTIME_SEMANTIC_INTERPRETER.md`
as its single build-time instruction source and appends validated source JSON;
the Gemini adapter owns provider compatibility and transport. An executable
request test verifies the whole document is transmitted without a duplicate
handwritten instruction list. Clock fields use
24-hour `HH:mm` without seconds. Unsupported meridiem must not become an exact
clock: preserve `raw_text` and evidence, use a valid existing time representation
with null exact clock fields, and surface a focused Review finding. When no
supported daypart exists, `kind=none` with null clock/daypart fields preserves the
unresolved expression in `raw_text`; it does not mean the source expression is
absent. A partial source date without a supported year retains partial date
evidence rather than an invented full date. Absent source facts are permitted
unknowns, not completeness defects. Informative findings for safely preserved
ambiguity are non-blocking; do not force completion of information the source
never supplied. A genuine conflicting interpretation can require Review
resolution, but source uncertainty alone does not invalidate a draft. Preserve
source names and expressions verbatim and do not infer unsupported Day bindings.

Nullable URL fields accept source-supported HTTPS URLs or null. Preserve exact
supplied valid links. A missing relative image remains an unresolved asset
supporting item with reference text/evidence and null URL; its absence alone must
not fail interpretation. Omit a prospective action with no supported valid URL,
rather than inventing a URL or assigning null to a required non-nullable field.
No automatic model repair request is introduced by this contract.

External Markdown Benchmark #001 assesses the original pre-Review interpretation
separately from Review corrections and validated/rendered Canonical results.
Schema validity and complete coverage do not prove semantic faithfulness.
Comparison artifacts record bounded per-thinking-level success/failure/not-run
outcomes with safe failure classification; execution success with human review
pending is not model acceptance. These artifacts use only the permitted sanitized
benchmark-fixture exception, never production ReviewSession retention.

Schema version changes require migration/compatibility rules plus rerunning the
parser-quality fixtures for every enabled provider and source format.
### Deterministic Validator
Owns machine-checkable correctness:
- schema
- date/time
- trip range
- rollover
- ID uniqueness
- reference consistency
- obvious conflicts
- duplicate/reconciliation candidates
Reports findings.
Does not silently rewrite source intent.

Also validates the minimum response/draft gates and source coverage accounting described below.
### Review
Owns evidence-backed correction and approval decisions before final confirmation.
May:
- correct
- approve/reject interpreted intent
- add parser-missed content
- delete parser-created mistakes
Only confirmed output becomes active CanonicalTrip.
### Confirmation
Owns the final user action that turns a reviewed, authoritatively validated candidate into Confirmed CanonicalTrip.
Authoritative candidate validation must run after all Review corrections and optional resolution/enrichment changes; the confirmation transaction may rerun the same validation immediately before persistence.
If optional resolution/enrichment is enabled before confirmation, its persisted results must first return through Review visibility.
### Confirmed CanonicalTrip
Product-level trip Source of Truth.
Must not contain:
- raw model response
- provider metadata
- UI-only styling
- live runtime state

The current write contract is `canonical-trip.v3`, adding required nullable `supporting_items[].group = { id, label, order } | null`. An explicit v2 decoder sets group to null without changing existing content or identities. Source-derived groups are assigned after response validation, flow through confirmation, and never include workbook/AST objects or UI disclosure state. The strict v1 contract
remains accepted only through an explicit decoder: v1 user provenance migrates
to `user`, while v1 source provenance migrates to `legacy_unavailable` because
v1 did not retain a truthful source identity/locator. Migration preserves all
trip/entity/checklist identities and content, validates the migrated value, and
must not replace or delete the prior active record on failure.

Canonical v3 retains v2 semantics and permits `null` trip title, start/end date and timezone, nullable
Day date/labels/titles, null entity Day association, and nullable place facts.
Entity title remains a required non-empty semantic identity. A valid trip needs
at least one meaningful Day, entity, or supporting item; globally unique IDs,
unique Day source order, resolved references, valid relationships and valid
known calendar/time values remain mandatory. Presentation-only labels such as
`未命名行程`, `日期未定` and `當天行程` are never written back as facts.

Canonical v3 entity provenance is a positive allowlist:

```json
{
  "origin": "source | user | legacy_unavailable",
  "overridden_fields": [],
  "source_id": "opaque-stable-id | null",
  "locator_refs": []
}
```

`source` requires one opaque source ID and one or more bounded evidence-unit ID
references. `user` and `legacy_unavailable` require a null source ID and no
locators. Filenames, display names, excerpts, raw locator text, provider/model
data, evidence documents and ReviewSession payloads are prohibited.
### Presentation Projection
Deterministic mapping:
Canonical semantics → presentation semantics.
Examples:
- Transit → connector
- Optional → optional disclosure
- Free Time → flexible-space treatment
- Reservation → readiness metadata
Must not:
- parse source
- invent intent
- mutate CanonicalTrip
- branch by source format

Each Day projection emits one ordered, discriminated display tree. Every
canonical entity has exactly one primary placement: a relationship member is
placed inside its relationship group and is not also emitted as a standalone
full entity. Sequence relationships constrain order without creating a second
full rendering. Compact summaries may reference an already placed entity.
Alternative, conditional, fallback, and parent/child templates retain complete
supported member semantics and actions. Incompatible overlapping primary groups
are a blocking validation finding, not a renderer choice.
### Renderer
Consumes:
- presentation model
- Runtime Data when available
Must not read:
- raw Markdown
- workbook/PDF objects
- extracted blocks
- UnifiedSourceDocument
## 3. Stage behavior
### Source intake
Production source bytes, pasted source text, and full Review evidence are session-scoped unless explicitly approved otherwise.

Pasted Markdown must receive:
- a stable session `source_id`
- deterministic line/block locators
- the same UnifiedSourceDocument and Review path as a Markdown file

Pasting text is an intake mode, not a separate source format or Result UI family.
### Source validation
Reject early:
- unsupported type
- empty/unreadable
- corruption
- configured size violation

Equivalent source validation applies to pasted text, including empty input and configured size limits.

After normalization, file upload and pasted input must satisfy the same `TextSourceInput` schema before extraction.

After extraction, every adapter result must pass the executable source-document
gate before request construction or provider invocation. A schema, identity,
ordering, locator, reference, hierarchy, or configured-limit failure is a
bounded source/preflight failure and preserves the active trip.
### Extraction/reconstruction
Preserve enough content + structure to interpret intent correctly.

Format-specific responsibilities:
- Markdown preserves block order, hierarchy, links, and source locators.
- XLSX extracts calculated/cached displayed cell values plus relevant sheet,
  row, column, merge, source-order, formula, and hyperlink evidence into
  `UnifiedSourceDocument`; it does not infer itinerary meaning from cell
  position alone.
- CSV is reconstructed as one visible sheet with stable row/column locators.
- hidden workbook sheets are ignored and do not count toward interpretation or
  source coverage.
- PDF is rejected as an unsupported input type; later Result-to-PDF export is a
  different boundary.

Initial spreadsheet source limits:
- experimental extensions: `.xlsx`, UTF-8 `.csv`; `.xls` stays rejected until its real-sample extraction acceptance
- maximum 19 visible sheets, using Sample #19 as the evidence ceiling
- original-order visible sheet selection defaults to all and requires at least one; normalized selected indices plus exact bytes form source identity, excluding filenames
- excluded visible sheet names are metadata, not covered evidence; hidden sheets are absent from both
- 128 MiB input, 50,000 evidence units and 20 MB serialized source document; no silent truncation
- merge anchors retain bounds; independently populated covered cells retain their own contained evidence and warning
- display text stays authoritative, including an empty display; auxiliary number/boolean/date-system hints cannot establish missing visible years
- formula cells contribute their calculated/cached displayed value; a missing,
  stale, or error cached value produces an extraction finding rather than
  executing arbitrary workbook code

Irregular layout is not itself a reason to reject a workbook. The adapter must
extract all usable non-empty cells and relevant structure with stable locators;
Gemini assigns semantic roles. Reject before interpretation only for technical
failure such as corrupt/encrypted input, unsupported extension, exceeded hard
limits, or no usable visible cell content. If extraction succeeds but Gemini
cannot establish a supported trip/day structure, return schema-valid
`insufficient` with complete coverage and reasons instead of calling the file
unsupported or inventing structure.

For a workbook too large for one safe request, chunk only at structural
boundaries: whole sheet first, then contiguous used regions/table blocks when a
sheet still exceeds the configured token budget. Never split an individual row
or merged region without carrying its headers/context. Every chunk retains
sheet name, source order, cell ranges, merge/header context, and stable source
references. Chunk results pass through deterministic reference checks and a
global reconciliation step before Review; no chunk may confirm or render
independently. The current slice supports whole-sheet chunks: every request is preflighted before the first call, runs serially under one workflow signal/deadline, and undergoes strict local and global validation. A single over-budget sheet fails with a technical-limit reason and zero calls; region chunking remains contingent on acceptance evidence. Provider IDs/references are namespaced by source, only source-supported equal-date Days merge, conflicts remain visible, and an insufficient chunk makes the complete result insufficient. Clearing unsupported trip bounds retains the original partial-date source text.

The application owns one session-only prepared-source cache for unchanged Markdown and spreadsheet retries. Retry reloads credentials and creates fresh session/request identities; file/paste/mode/selection edits, explicit clearing and inactive preparation invalidate reuse. Inspection and actual extraction run under their respective deadlines. Spreadsheet intake metadata never pretends to be a Markdown text input.

Review receives bounded tabular excerpts with relative coordinates, sheet names, displayed text and locators. Sparse mini-grids expose row/column labels and gaps without dense worksheet allocation; long cells continue in bounded fragments, and mobile scrolling stays inside the grid. One image disclosure lists recorded references; absent embedded-image inventory must not become a fabricated zero count. Selected-scope coverage names excluded sheets and counts unparsed content.

Successful spreadsheet extraction does not count as semantic parsing. The
resulting `UnifiedSourceDocument` must be interpreted by Gemini through the
same `SemanticInterpretationResult` contract. A valid browser-local Gemini key
is a precondition for beginning interpretation. There is no local-rule fallback.
### Classification/interpretation
Classify blocks such as:
- itinerary
- transport
- accommodation
- reservation
- reference
- research
- runtime instruction
- procedure
- preparation
- personal note
- unknown
Non-itinerary ≠ discard.

Every block must receive an explicit coverage disposition. Content the interpreter cannot safely classify or attach must enter `coverage.unparsed_items`; it must never disappear from the response.
### Normalization
Normalize representation, not intent.
Allowed:
```text
2026/9/12 → 2026-09-12
```
Forbidden:
```text
about 10:30 → exact 10:30
```
Cross-midnight:
preserve raw representation and source-day grouping.
Open-ended:
```text
18:30~ → start=18:30, end=null
```
### Reconciliation
Merge conceptual duplicates conservatively.
Never dedupe solely by naive title/place equality.
### Validation
Emit structured findings:
```json
{
  "severity": "warning",
  "code": "LOCATION_CONFLICT",
  "entity_refs": ["..."],
  "source_refs": ["..."]
}
```

### Minimum output gates
The pipeline distinguishes three gates:

#### A. Valid interpretation response
Required before the system can present any parse outcome:
- `SemanticInterpretationResult` conforms to the versioned required schema
- `source_id` matches
- coverage counts and references are internally consistent
- every validated evidence unit is accounted for
- every unparsed item has locator + reason + severity + message

Failure at Gate A is a parse/schema failure, not a partial draft.

#### B. Reviewable draft
Required before normal Review/confirmation:
- `status = draft`
- at least one supported trip/day structure exists
- at least one itinerary entity is linked to that structure
- every entity has required identity, semantic type, source reference, and explicit time precision including `none` when untimed
- all blocking missing structure is resolved

If Gate A passes but Gate B fails, return `status = insufficient`, list all known unparsed/missing requirements, and offer only bounded structural recovery or source replacement. Do not fabricate a draft.

#### C. Renderable confirmed result
Required before Overview/Day:
- Review corrections complete
- authoritative candidate validation passes
- user confirms
- persistence succeeds

No percentage confidence threshold substitutes for these structural gates.
### Review
Material findings must be individually visible:
- blocking errors
- warnings
- ambiguity
- low confidence
- broken evidence
- preserved reference blocks
- unparsed source items with locator + reason
- user overrides
### Place resolution
Not required for Generalized Product V0.
When enabled, resolve only place intent explicitly approved in Review.
If ambiguous:
return to Review and ask the user.
Never silently select the most popular candidate.
### Enrichment
May add verified metadata to an existing entity.
May not add itinerary intent.
Anything persisted into CanonicalTrip must be visible before final confirmation and pass authoritative validation.
### Render
```text
CanonicalTrip + Runtime Data
→ Presentation Projection
→ Result UI
```
Static Trip Data must survive Runtime Data failure.
## 4. Provenance
Canonical entities retain stable provenance identifier + locator.
Full excerpts remain Review evidence, not durable trip truth.
Minimum:
```json
{
  "source": {
    "source_id": "...",
    "locator": "..."
  }
}
```
## 5. Override contract
```text
User Override
> Verified External Data
> Parser Result
> Raw Source Inference
```
Reparse/resolution/enrichment must not overwrite user overrides.
## 6. Runtime separation
CanonicalTrip:
stable trip semantics.
Runtime Data:
dynamic execution state.
On runtime failure:
- preserve static itinerary
- omit unsupported NOW/NEXT/leave-by
- never synthesize precision
## 7. Replacement import transaction
When an active trip exists:
```text
candidate source intake
→ parse
→ validate draft
→ review
→ validate candidate
→ confirm
→ persist
→ atomically replace active trip
```
Before confirmation:
- active trip remains readable
- failure/cancel preserves it
- stale responses cannot replace state

One application workflow owns the candidate lifecycle and request/session
identity from reading through confirmation. Its processing modal is derived from
that state rather than keeping a synchronized feature-level progress owner.
Configured stage/overall deadlines cover reading, extraction, source validation,
provider work, and local response validation independently of the provider
attempt deadline. The modal blocks accidental dismissal while active but offers
an explicit `停止這次判讀` action. Success, insufficient, failure, timeout, and
stop are exhaustive terminal outcomes; each clears timers, aborts remaining
work where applicable, closes the modal, preserves the selected source where
technically possible, and ignores inactive late results.
## 8. Hosted Delivery boundary
`build-trip-runtime-v0` ends at local confirmed/renderable CanonicalTrip.
Hosted Delivery starts only after External Markdown Benchmark #001 passes.

Hosted Delivery Lite targets one Netlify application serving many independent
publications. Travelers/viewers are product users, not Netlify team members.
Lite does not introduce product accounts:

```text
owner browser
→ Netlify publish Function
→ viewer-safe PublishedTripSnapshot
→ publication record keyed by unlisted slug
→ read-only Viewer
```

Multi-user isolation rules:
- one publication cannot read, replace, revoke, or delete another publication
- each publication has a unique slug, immutable snapshot ID, and separate
  one-way recovery verifier
- slug creation uses a conditional `onlyIfNew` write
- republish/revoke/delete uses the current ETag/recovery verifier so concurrent
  writes cannot silently overwrite one another
- public reads may use eventual consistency; management mutations and immediate
  verification use strong-consistency reads
- publish/manage Functions enforce schema validation, positive allowlist
  projection, payload limits, and per-IP/path rate limiting
- every user's hosted traffic/storage/function use consumes the product owner's
  Netlify project quota; a user's Gemini key and Gemini usage remain
  browser-to-Gemini and never enter Netlify

The exact domain, expiry duration/extension policy, backup/migration policy,
lost-secret behavior, expired-page treatment, and PDF export execution location
remain a separate Hosted Operations decision after the Lite architecture gate.

Hosted storage must not receive:
- raw source files or pasted source text
- UnifiedSourceDocument
- source excerpts
- Review evidence
- parser responses
- personal AI keys
## 9. Failure contract
Each boundary fails explicitly.
Examples:
- extraction failure: cannot read file
- source-document failure: invalid evidence identity/order/locator/reference or unsafe request size; do not call the provider
- processing deadline or explicit stop: abort current work, close the modal, and preserve source/active trip
- schema-invalid interpretation response: reject/retry without advancing
- structurally insufficient interpretation: list missing/unparsed content and offer bounded recovery
- parse uncertainty: surface ambiguity
- place ambiguity: request choice
- runtime failure: live value unavailable
Never collapse failures into an opaque generic "AI failed" state.
No processing state may hold the blocking modal without an application-owned
deadline and explicit stop path. Transport retry must not silently switch
models.
## 10. Invariant summary
```text
Source-specific extraction
≠ source-specific Result UI
ParsedTripDraft
≠ product truth
Validation
≠ silent correction
Review
= trust boundary
CanonicalTrip
= confirmed trip truth
Presentation Projection
≠ second trip truth
```
