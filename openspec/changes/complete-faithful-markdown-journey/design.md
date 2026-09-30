## Context

The product goal is Existing Itinerary → Structured Trip → Useful Runtime UI.
The full review identifies eight actionable categories, recorded in
`temp/validation/full-document-review-2026-09-07.md`. Three old changes supply
substantial implementation and tests but leave eight unchecked acceptance tasks.
Their historical checkmarks remain evidence of the work performed, not proof
against newly discovered counterexamples. See `handoff.md` for exact ownership.

Verified baseline: source-document gate, one application-owned workflow,
timeouts/stop/late-result rejection, explicit Golden selection, complete Day
relationship templates, prompt-document integration and atomic local trip
replacement. Latest recorded checks are 299 unit cases, 10 focused browser
cases and a successful build; this planning change does not rerun or extend that
claim. The live exact-model comparison failed at low; medium/high entered
Review but retained fidelity defects. Official model research selected exact
stable `gemini-3.8-flash` as the next candidate. Its gates have not yet been
rerun, and no production default is accepted.

## Goals / Non-Goals

**Goals:**

- A source with partial dates, raw ambiguous time, alternatives, an address-first
  place and undated travel information can be confirmed, persisted, reloaded and
  read completely on mobile and desktop without forced factual completion.
- Invalid dates/times/references are rejected consistently at every trust entry.
- Review recovery effort and Result usefulness are measured separately from
  original parser quality, using the source as the comparison baseline.
- The actual static entry delivers the intended security policy; Golden remains
  usable and document status cannot imply unsupported acceptance.

**Non-Goals:** see proposal. No replatforming or new provider abstraction; the
existing Source Adapter → interpreter → Canonical → projection seams remain.

## Decisions

### 1. Three source states, one consistent policy

Absent information is a permitted unknown. Ambiguous supplied information keeps
the original expression and relationship, with non-blocking explanation when
useful. Structurally invalid data or genuine unrepresentable conflicts require
correction or safe failure. IDs and minimum itinerary structure are still
required; allowing absent facts does not mean accepting arbitrary empty JSON.

Remove the extra builder requirement for complete trip dates and audit all
schema-nullable fields through types, Home, confirmation and Result. Retain
partial date labels and ordered Day identities. UI fallback labels describe an
unknown value without being written back as a fabricated trip fact. Exact
runtime calculations must remain unavailable when their inputs are unsupported.
Alternatives considered: compulsory date forms or model guesses would defeat the
user's explicit direction; weakening all validation would accept malformed data.

### 2. Shared semantic checks at all trust entries

Extract source-independent checks for calendar validity, trip/day range,
time-kind shape, cross-midnight rules, IDs and relationships into trip-domain
functions usable by both draft and canonical validators. Source identity and
coverage remain draft/interpreter-only. The authoritative validator is used by
confirmation, JSON import and repository reads/writes. Unknown values pass only
where the contract allows them. Preserve safe error vocabulary and atomic
replacement; never coerce malformed import data to make it pass.

### 3. Total presentation with an undated primary region

Projection owns primary placement for each entity across the whole trip:
one known-Day tree or one trip-level undated tree. Add an accessible undated
information section in the existing Overview/Day journey, not a format-specific
renderer or a fake calendar Day. Reuse full semantic entity and relationship
templates. Optional content remains optional in both regions; supporting content
has a reachable secondary surface.

Result presentation uses a source-supported month/day expression retained in a
Day label when the full calendar date is null. This display-only fallback does
not populate Canonical date fields or enable date-dependent runtime behavior.
When neither a full date nor a recognizable month/day label exists, Result uses
the neutral unknown-date fallback. Persistent Result controls reserve their own
layout space above the mobile horizontal date rail instead of overlaying it.
Unavailable relative-image supporting items keep their original Canonical text
unchanged while projection derives a bounded, human-readable attachment name
and the renderer explains that the image file was not included.

For relations spanning regions, retain shared relationship identity and context
with compact links/references to other members; never duplicate full entities
or infer a Day to hide placement gaps. Sequence uses source/entity order without
inventing chronology. Define the supported fragmentation rules and reject only
genuinely incompatible composition before rendering. Extend placement invariants
from per-Day counts to all canonical entity IDs, including null-Day IDs.

### 4. Faithful interpretation and focused Review

Keep the maintained Markdown prompt as the instruction source and schema
descriptions as field-format guidance. A prompt is not a semantic validator.
Use existing sanitized outputs to reproduce name-character substitutions and
unsupported day/time inference. Add deterministic checks only where source
support can actually be established; an exact-string match is useful evidence
but is not proof of all semantic relationships. Do not put benchmark answers in
production prompts or blindly overwrite model fields with heuristics.

Review exposes source evidence beside material findings and corrections. The
user can retain faithful unknown values and can inspect normal entries without
editing every field. Preserve existing edit/add/delete/revert parity. Measure
time to confirmation and correction counts; do not call the experience efficient
based solely on mocked component tests. A corrected draft cannot retroactively
turn a failed original parser output into a pass.

#### One model, stable prepared-source retry and candidate-aware findings

V0 constructs only the configured primary Gemini parser. Remove
`VITE_GEMINI_FALLBACK_MODEL`, the fallback parser/controller projection and the
alternate-model retry action. Bounded transport retry for `429` or `503` uses
the same parser and exact model; exhaustion enters the existing recoverable
provider-failure state. This does not select or activate a production default.

Keep the domain nouns distinct: a `prepared source` is the validated
`TextSourceInput` plus `ValidatedUnifiedSourceDocument`; a `ParsedTripDraft` is
the Review candidate; a `candidate model` is the exact Gemini model awaiting
acceptance. After provider or output-validation failure, retry of unchanged
selected Markdown reuses the prepared source, including `source_id`, evidence
IDs and locators, while creating fresh workflow session/request ownership and
reloading the credential. Editing, replacing, removing or clearing the selected
source invalidates reuse. Failure before source-document validation reruns only
the incomplete source preparation needed to reach that boundary.

Provider finding codes are routing hints, never fidelity proof. Deterministic
Review policy resolves every relevant `source_ref` and inspects the current
candidate:

- a missing-year finding is informative only when the unsupported full date or
  year remains null **and** its `source_refs` resolve to bounded
  `ReviewEvidenceItem` content that still exposes any supplied month/day
  expression;
- an ambiguous-clock finding is informative only when its references resolve to
  the source clock expression, candidate `time.raw_text` retains that expression
  verbatim, and unsupported `start`, `end` and `daypart` precision remains null;
- missing scope, an unresolved reference, discarded partial-date evidence,
  substituted raw text or contradictory exact precision remains blocking;
- an explicit user-authored correction retires/reconciles the obsolete provider
  ambiguity finding after authoritative revalidation; current deterministic
  conflicts remain blocking and cannot be acknowledged away;
- local extraction warnings that cannot introduce a candidate fact retain their
  explicit local severity.

Candidate edits rerun this policy. The Arabic-hour detector adds the evidenced
marker form `12點` when no explicit daypart is present. Colon/dot forms such as
`12:30` are not unconditional positive ambiguity fixtures: they require
source/context evidence that a 12-hour interpretation is unresolved. Legal
24-hour values and explicit noon/midnight/AM/PM expressions remain negative
fixtures. Passing this bounded detector is necessary evidence only, not general
semantic proof.

#### Review by exception, not full-document inspection

The normal Review path is a compact commit checkpoint, not an obligation to
inspect every parsed field. Its default surface shows a trip summary, the count
and outcome of conservative system handling, and only findings that require a
traveler decision. Normal Day/entity editors and informational evidence remain
available behind an explicit `查看完整校對內容` disclosure. The final
`確認並使用這份行程` action remains explicit because it atomically replaces the
active trip; removing full inspection does not authorize automatic activation.

Review effort scales with unresolved exceptions, not with entity count:

```text
validated provider draft
        |
        v
closed, deterministic conservative handling
        |
        +-- safely representable uncertainty --> adjusted candidate + visible summary
        |
        +-- no safe representation -----------> focused blocking decision
        |
        v
compact confirmation --> authoritative validation --> atomic persistence
```

Conservative handling is not a general repair pass. It uses a closed allowlist
of evidence-backed transformations that can only remove unsupported precision
while retaining the source expression and evidence references. It MUST NOT add
facts, choose an alternative, assign a Day, rename a place, delete an entity or
otherwise increase semantic commitment. The first approved case is an inferred
exact/approximate/daypart clock that the existing source-support check proves is
not supported: downgrade it to the valid unknown-time representation, preserve
`raw_text`, mark the affected time unresolved, and record a session-only before /
after adjustment for the compact Review summary. If a finding cannot be handled
without guessing, it remains blocking.

The original provider result and adjusted candidate remain distinct in
acceptance evidence so system recovery cannot improve the recorded parser-quality
score. Production persists neither provider output nor Review adjustment logs.
The adjusted candidate must pass the same authoritative validator as a manually
edited candidate. A generic acknowledgement action MUST NOT dismiss a finding
when the candidate still contains the detected unsupported value; acknowledgement
is reserved for questions whose truth genuinely depends on external human
knowledge, and must be recorded as an explicit user decision.

### 5. Minimal provenance with explicit compatibility

Canonical retains an opaque source identity and bounded source-neutral locator
reference for source-authored entities, with an explicit user/legacy-unavailable
representation. Do not derive stored IDs from filenames, source excerpts or
other content-bearing strings. Never persist the evidence document, source text,
provider output or production ReviewSession. The locator is a trace reference,
not a promise that the original file can be reopened after reload.

Before implementation, specify the exact allowlist and versioning: a new
Canonical contract must have explicit supported-version decoding/migration for
existing v1 trip records and JSON imports, without fabricated provenance. Do not
silently broaden a strict v1 contract. Migration validates old and new values and
preserves the prior active record on failure. This prerequisite is task 1.3;
its exact schema shape is bounded engineering work, not permission to store raw
evidence. Projection/Renderer never inspect provenance to choose appearance.

#### Implementable Canonical compatibility contract

The persistent target is `canonical-trip.v2`; v1 remains a supported read/import
format and is never broadened in place. Canonical v2 keeps the existing root,
Day, entity, relationship and supporting-item content fields, with these exact
contract changes:

- root `title`, `start_date`, `end_date` and `timezone` are nullable;
- entity titles remain required non-empty presentation identities; Day titles,
  place name/address/URL and supported dependency details remain nullable;
- every entity provenance contains only `origin`, `overridden_fields`,
  `source_id` and `locator_refs`;
- `origin` is `source`, `user` or `legacy_unavailable`; `source` requires one
  opaque stable `source_id` plus one or more bounded evidence-unit IDs in
  `locator_refs`; the other origins require `source_id=null` and an empty
  locator list;
- each provenance string uses the existing stable-ID grammar and bounds; no
  display name, filename, excerpt, raw locator text, provider/model value or
  Review payload is allowed.

The confirmation call receives the current validated document's opaque
`source_id`; source-authored entities retain only their deduplicated
`source_refs` as locator IDs. User-created entities persist as `user` without
source identity. A v1 record/import decodes to v2 in memory: v1 `user` remains
`user`, while v1 `source` becomes `legacy_unavailable` because inventing the
missing identity/locator would be false provenance. IDs, checklist `todo_id`s,
entity order and all content values remain byte-for-byte equivalent during that
migration. Writes persist only validated v2 records.

Decode or migration failure returns the same bounded invalid-record/import
outcome and leaves the active pointer and prior record untouched. No migration
deletes v1 data as a recovery tactic. Rollback may continue using the v1 decoder;
new v2 records are not silently downgraded because that would discard trace
data. The storage inspection must prove only the allowlist above crosses the
durable boundary.

#### Nullable-value and minimum-structure audit

Executable schema, TypeScript and UI follow one matrix:

| Value                                  | Supported unknown          | Minimum / presentation rule                                                                                                                                                                                   |
| -------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trip title                             | yes (`null`)               | Home/Result use neutral `未命名行程`; fallback is never persisted                                                                                                                                             |
| Trip start/end                         | yes (`null` independently) | no countdown/NOW/range precision without both supported dates                                                                                                                                                 |
| Trip timezone                          | yes (`null`)               | no inferred runtime timezone; Golden remains `Asia/Tokyo`                                                                                                                                                     |
| Geography                              | empty array                | Overview omits the route instead of inventing places                                                                                                                                                          |
| Day date/title/subtitle/label/leave-by | yes (`null`)               | stable Day ID and unique non-negative `source_order` retain navigation/order; Result uses a recognizable source-supported month/day label before `日期未定`, without enabling date-dependent runtime behavior |
| Entity title                           | no                         | required non-empty semantic identity; address-first content may use its source wording, not a guessed venue name                                                                                              |
| Entity Day                             | yes (`null`)               | entity must receive one undated primary placement                                                                                                                                                             |
| Place name/address/URL                 | yes (`null`)               | a place may be address-first; no generated URL                                                                                                                                                                |
| Time fields                            | shape-dependent nulls      | raw ambiguous text is retained; malformed known shapes block                                                                                                                                                  |
| Dependencies                           | nullable object/details    | absence is not action-needed; supplied statuses remain exact                                                                                                                                                  |
| Supporting text/URL                    | individually nullable      | at least one must carry supported content                                                                                                                                                                     |

Minimum valid Canonical structure is a stable trip ID, schema version, ordered
collections, and at least one meaningful Day/entity/supporting item. All IDs are
globally unique; Day source order is unique; references resolve; entities have
non-empty titles; relationships are structurally valid; all known calendar/time
values are semantically valid. Missing optional facts do not satisfy or violate
that minimum by themselves. Empty strings are not substitutes for null.

### 6. Versioned outcome evidence

Define assessment categories: faithfully preserved known fact; faithfully
preserved unknown; explained ambiguous meaning; unsupported invention; semantic
omission. Specify expected representation for every existing annotation before
scoring new results. Preserve the original 15 annotations and historical scores;
the new rubric explains which unknowns need no extra finding. Record rubric
version, artifact identity, exact model/thinking configuration and reviewer
observations. Missing/invented critical events and unsupported exact critical
facts remain zero-tolerance gates. Proper-name corruption is recorded explicitly.

Run deterministic replays and Review recovery using existing fixture outputs
first, then charged live requests only for relevant changed generation behavior
or the required final gate. Keep original, correction and confirmed-result
artifacts separate under the sanitized-fixture exception. No telemetry service
or production source retention is introduced. Manual usability notes can record
task success, time-to-find, wrong interpretations and return-to-source reasons.

One failed thinking level does not erase another level's evidence; one schema-
valid level does not establish semantic acceptance. Production activation of
the exact stable candidate requires the generated provider-schema checks,
deterministic parser fixtures, a key-backed live External Markdown Benchmark
#001 result, integrated Review/Result acceptance, documented qualifying evidence
and explicit configuration; no moving alias or silent alternate-model fallback.

### 7. Deployment, performance and travel readiness

Current Golden hosting uses the checked-in Netlify static configuration:
`netlify.toml` builds and publishes `dist`, while `public/_headers` declares the
host-delivered CSP. The HTML meta policy remains a portable defense-in-depth
subset. Test production-built entry behavior and do not claim live
`frame-ancestors` protection until the deployed Netlify response is inspected.
Preserve MUI/Emotion compatibility without opening arbitrary scripts or
connections. This static configuration does not implement Hosted Delivery
Functions, Blob storage, publication or recovery behavior.

Measure cold start and confirmed-trip reopen under a stated mobile/network
profile. Use results to decide whether import/Review lazy loading or font loading
changes are necessary; preserve frozen fonts/tokens and accessibility. Verify
key absence, provider failure, weak network and reload separately. Browser-local
trip data alone is not an offline app guarantee. New caching architecture is
deferred unless evidence justifies a scoped follow-up.

### 8. Evidence-preserving consolidation

This is the only active implementation/acceptance owner after migration. Archive
the three predecessor changes with a `closure.md` that states transferred,
not accepted. Leave all eight unchecked items unchecked. Every predecessor task
and review finding maps to an unchecked successor task. Do not sync stale delta
text over newer main specs. Missing baseline Gemini/failure capability records
must be reconciled deliberately against current deep-interpreter ownership,
not copied as adapter-owned gates. Update current entry links and rebase archived
relative links; preserve research and original benchmark outputs.

## Risks / Trade-offs

- Permitting unknown dates limits countdown/NOW → keep ordered static reading
  and do not infer runtime precision; generalized Today remains deferred.
- Undated relation fragments can confuse users → retain relation context and
  test navigation/member completeness on both viewports.
- Provenance change can break saved trips → version explicitly, migrate safely
  and never clear old data to get a green test.
- Prompt changes can regress other source expressions → replay semantic fixtures
  and use additional evidence samples only with recorded fixture provenance;
  do not optimize for one benchmark's expected answers.
- A useful UI may still require too much Review → compare correction effort and
  source lookup burden before expanding formats or business features.
- Archive can look like a pass → closure banners, open-item mapping and current
  gate status remain visible from README and the successor handoff.

## Migration Plan

1. Complete successor artifacts and verify all handoff mappings before moving
   predecessor directories. Keep the new implementation tasks unchecked.
2. Archive predecessors with their metadata/history; maintain current document
   links and explicitly record sync decisions. No source/application code changes
   occur in this planning migration.
3. Implement shared validation/unknown-value and provenance compatibility work;
   then full placement and Review behavior, each with decisive regressions.
4. Reassess fixture outputs, verify real-result recovery, static deployment and
   Golden compatibility, then run the exact-model acceptance gate.
5. Record product usability evidence and remaining limitations. Archive this
   successor only after its own evidence is complete or a separately explicit
   transfer; do not substitute task percentage for acceptance.

Rollback: document moves can be reversed without changing checkmarks; preserve
archive metadata. Implementation rollback must retain readable saved trips via
the supported-version strategy, not destructive storage resets. No deployment,
commit or push is authorized by this plan.

## Open Questions

- Measured Review burden and mobile lookup improvement have no validated numeric
  threshold yet; record actual observations, not invented success targets.
- Weak-network/cold-start measurements will determine whether a separate offline
  capability or asset optimization is justified.
- Cross-format expansion and commercial pricing remain later evidence questions;
  they do not block the bounded V0 correction work described here.
