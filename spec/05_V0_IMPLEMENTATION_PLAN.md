# Trip Runtime — V0 Implementation Plan

> Status: Execution Plan  
> Goal: Validate unfamiliar Markdown through Understand + Trust; implement the approved narrow spreadsheet slice before delivery, with independent acceptance gates.

## 1. V0 objective

```text
Markdown
→ Source Adapter
→ UnifiedSourceDocument
→ Semantic Interpreter
→ SemanticInterpretationResult
→ Required Response / Reviewable Draft Gates
→ ParsedTripDraft
→ Deterministic Draft Validation
→ Review
→ Authoritative Candidate Validation
→ User Confirmation
→ Confirmed CanonicalTrip
→ Local Overview / Day rendering
→ External Markdown Benchmark #001 gate
```

V0 does not include Hosted Delivery implementation.

## 2. Scope distinction

### Golden Viewer
Real Osaka viewer in the current checkout. Treat it as a reference artifact, not as the Generalized V0 implementation baseline.

May contain:
- Overview
- Today
- Day
- reservations
- directions
- checklist
- runtime prototype behavior

### Generalized Product V0
Validation target for unfamiliar Markdown.

Required:
- Home / Upload
- Markdown parsing
- Review
- Canonical persistence
- Overview
- Day
- local result usability

### V0.1
Hosted Delivery Lite after the benchmark gate.

## 3. Implementation baseline

This document defines implementation order, constraints, and acceptance gates.
Current completion state is recorded in
`openspec/changes/complete-faithful-markdown-journey/tasks.md`; do not duplicate
task progress or dated implementation snapshots here. Its `handoff.md` maps the
review findings and all open tasks from the three archived predecessor changes.
The parallel narrow spreadsheet execution owner is `openspec/changes/add-spreadsheet-intake-and-result-clarity/tasks.md`; its handoff/validation files distinguish local extraction/UI verification from pending live acceptance. Prepared-source retry is shared with the Markdown owner’s task 4.10, rather than a separate spreadsheet cache.
Those archives retain completed implementation evidence and unchecked tasks;
archiving did not pass the external benchmark or activate a production model.

The correction order is consistent unknown-value/validation contracts, complete
confirmed-trip presentation, faithful interpretation and Review recovery, then
deployment/Golden checks and separately reported parser/Result usability gates.
The milestone is a real Markdown trip with partial dates, raw ambiguous clocks,
alternatives and undated information that can be confirmed, stored, reopened
and fully read on mobile and desktop without compulsory factual completion.

The checked-in Osaka/Uji/太秦 viewer remains reference material and a real-use
fallback. Do not retrieve or inherit implementation from the discarded branch
merely to recreate its previous baseline.

### Implementation language and boundary checks

- New active product, test, fixture-harness, and tool-configuration code must be TypeScript.
- TypeScript types provide compile-time feedback inside owned modules; they do not validate untrusted data.
- The versioned JSON Schemas and deterministic validators remain runtime authority at source, provider, import, and persistence boundaries.
- Source- and provider-specific types stop at their adapters. CanonicalTrip and Result UI code must remain source- and provider-agnostic.
- Prefer framework/library primitives, then composition, then focused extraction; introduce abstractions only for demonstrated variation or an external boundary.

## 4. P0 implementation work

### Data contract
- Canonical schema version
- TypeScript internal types aligned with, but subordinate to, executable runtime schemas
- versioned `TextSourceInput` schema shared by file and pasted input
- executable, versioned provider-neutral
  `semantic-interpretation-result.v2.schema.json`
- executable, versioned provider-neutral `parsed-trip-draft.v1.schema.json`
- strict required fields, explicit nullability/enums, stable-reference rules,
  and rejection of unknown members
- interpretation status: draft / insufficient
- complete validated evidence-unit coverage accounting (the frozen v1 response may retain block-named serialized fields)
- structured unparsed item: locator / reason code / severity / message
- stable entity IDs
- provenance identifiers / locators
- confidence / review state
- unresolved state
- user override identity
- source asset reference support
- exact/approximate/daypart/no-time/open-ended time precision
- cross-midnight relation
- alternative/conditional/fallback relationships
- tentative/flexible state
- reservation/ticket/readiness and source-provided deadline/buffer

### Markdown Source Adapter
- accept one Markdown file or pasted Markdown text through the same adapter contract
- normalize both modes into the same required `TextSourceInput` envelope
- assign stable session source IDs and line/block locators to pasted input
- preserve Markdown structure
- preserve source order and locators
- missing relative assets do not fail the document
- do not treat Markdown AST as semantic truth

### Unified source-document gate
- define and enforce one executable, versioned `UnifiedSourceDocument` JSON Schema
- emit ordered source-neutral evidence units with stable IDs and locators while preserving constrained Markdown structure
- validate source identity, uniqueness, order, locators, parent/header references, hierarchy cycles, extraction-finding references, and configured byte/token limits before any provider call
- expose only a validated source document to interpretation
- project bounded `ReviewEvidenceItem` values for Review; do not pass Markdown AST, workbook objects, adapter-private types, or provider envelopes to Review
- keep raw source, validated source documents, and Review evidence session-only

### Semantic Interpreter
- provider-neutral interface
- implement one Gemini adapter for V0; other providers/models are later
  optimization scope
- evaluate exact `gemini-3.5-flash` as the user-selected exact default candidate and activate
  it in production only after its generated-schema, deterministic parser, and
  live External Markdown Benchmark #001 gates pass
- do not use a moving model alias or silently fall back to another model
- put source assertion, preflight, provider invocation, local response-schema validation, coverage Gate A, and Reviewable Draft Gate B behind one deep `interpretTrip` interface; keep Gemini transport concerns in the adapter
- require one versioned response envelope independent of provider
- require every provider and source format to emit the same schema-valid output;
  do not create Markdown/spreadsheet-specific draft schemas
- request native structured output when available, then run the same local
  deterministic JSON Schema validation for every provider
- emit schema-valid insufficient outcomes without fabricating a draft
- account for every validated evidence unit as interpreted, preserved supporting/non-itinerary, or explicitly unparsed
- list every unparsed item with stable locator, reason code, severity, and message
- one-shot parse as primary V0 path
- structured output
- mixed time notation
- inline multi-unit sequences
- exact/approximate/daypart/no-time/open-ended and cross-midnight semantics
- free/flexible/optional/tentative semantics
- alternative/conditional/fallback relationships
- reservation/ticket/deadline/buffer semantics
- incomplete entities
- conservative unresolved-place interpretation

### Validation
- schema
- input/response schema version and source-ID match
- source coverage totals/reference consistency
- zero silent evidence-unit omission
- minimum Reviewable Draft gate: supported trip/day structure + linked itinerary entity
- date
- time
- cross-midnight
- trip range
- IDs
- relationship/reference consistency
- duplicate candidates
- logical conflicts
- open-ended time

### Workflow shell
- Home supports separate, operable Markdown file upload and pasted Markdown text input paths
- pasted input includes explicit start, empty-input validation, and clear/replace behavior
- provider/credential, Canonical JSON import, privacy, and sample controls remain reachable through explicit secondary-surface controls
- one active confirmed trip remains separate from one candidate import/review state
- successful confirmation derives Home, success, Overview, and Day from the same newly active trip and clears the candidate state
- grouped progress communicates source reading, source-document construction, semantic interpretation, and validation/Review preparation
- one application workflow owns candidate source/document, stage, request/session identity, interpretation, Review, confirmation, failure, cancellation, and terminal cleanup; intake controls retain only unsubmitted file/paste form state
- configured stage/overall deadlines cover reading, extraction, source validation, provider work, and local response validation independently of the provider attempt deadline
- the blocking processing modal prevents accidental Escape/backdrop dismissal but exposes `停止這次判讀`; stop/timeout/failure must abort active work, clear timers, close the modal, preserve the selected source where technically possible, and keep the confirmed trip readable
- late success or failure from an inactive request/session identity is ignored
- uninterpretable day/date structure offers bounded structural recovery without guessing or planning
- schema-valid insufficient results list missing/unparsed items instead of entering normal Review
- schema-invalid parser output fails/retries and never advances
- confirmed success appears only after authoritative validation and successful persistence

### Review
- original evidence
- unparsed source items and missing required structure remain explicitly visible
- field correction for date/day, time, title, type, note, time precision, and place text
- optional/tentative/flexible correction
- warning/ambiguity visibility
- add parser-missed event
- delete parser-created mistake
- request final confirmation after authoritative candidate validation
- preserve user override identity
- centered single-column Review on mobile and desktop
- read-only source excerpt before every material finding/correction surface
- shared mobile/desktop correction capability with responsive composition only
- automatically interpreted items remain inspectable/editable

### Persistence / import
- local active trip persistence
- canonical JSON import
- replacement transaction safety, including rollback/preservation on validation or persistence failure
- one consistent active-trip identity across Home, success, Overview, and Day after replacement

### Result rendering
- deterministic Presentation Projection
- one ordered, non-overlapping Day display tree with exactly one primary placement per canonical entity
- compact summaries may reference an entity but must not duplicate its full primary rendering
- relationship groups preserve complete member time, place, modifiers, dependencies, notes, unresolved state, and exact actions
- incompatible overlapping primary relationship groups block confirmation instead of being resolved by the renderer
- source-agnostic templates
- Overview
- Day
- exact/approximate/daypart/no-time/open-ended time presentation
- free time
- optional
- tentative/unresolved states
- alternative/conditional/fallback relationships
- transit connector
- reservation/readiness and source-provided deadline/buffer
- note
- supporting references
- source-provided links/actions
- mobile horizontal Date Rail and single-column Day reading surface
- desktop Overview secondary column and three-region Day composition
- September 2026 newspaper visual grammar from `06_RESULT_UI_SPEC.md`: white
  paper, black ink, editorial serif hierarchy, thin rules, rectangular controls,
  and no card/shadow/rounded-container language
- time inline before the event title in small tabular utility type
- restrained 4px semantic markers for fixed, flexible, alternative, and
  tentative/needs-attention states; no semantic background-color blocks
- approximately 680px maximum primary reading measure on desktop
- readiness is presented read-only in Generalized V0; the interactive
  per-item / bulk-ready / collapsed all-ready / reset behavior described in
  `06_RESULT_UI_SPEC.md` §"When readiness is interactive" stays unbuilt until
  it is explicitly requested

### UI verification
- mobile and desktop viewports
- complete Review action parity across mobile and desktop
- operable file and pasted-text intake paths
- reachable provider/settings, credentials, privacy, Canonical JSON import, and sample/fallback controls
- existing-active-trip replacement success, failure, cancel, and stale-response paths
- permanently pending reading/extraction/provider/validation stages terminate through the configured deadline or explicit stop action; no timer or late result reopens or advances the closed workflow
- exact `gemini-3.5-flash` is not activated as the production default until the live benchmark gate passes, and no fallback model is invoked silently
- no horizontal overflow
- minimum 44px mobile interaction targets
- keyboard-operable primary controls and Date Rail
- light-paper semantic contrast; V0 has no dark-mode visual contract
- rectangular active/inactive Date Rail states remain distinguishable without
  relying on semantic color alone
- primary reading measure remains legible and approximately 680px wide on
  desktop while supporting regions do not become a dashboard
- no browser console errors
- semantic stress fixtures for approximate/open-ended/no-time, missing anchor, optional-heavy, free-time-heavy, alternative/conditional, unresolved, and runtime-unavailable states

## 5. P1 after benchmark gate

### Hosted Delivery Lite
- Netlify static Viewer + Functions + Blob storage for the Lite pilot
- positive allowlist projection
- immutable PublishedTripSnapshot
- TripPublication
- unlisted slug
- bounded expiry
- republish/revoke/delete management
- one service supports multiple travelers; viewers do not become Netlify team
  members and do not require product accounts
- isolate each publication by slug/snapshot/recovery verifier
- conditional writes prevent slug collisions and lost republish updates
- publish/manage endpoints enforce payload limits and rate limiting; all hosted
  usage consumes the product owner's Netlify quota

### Later parsing/enrichment
- semantic chunking beyond the V0.2 spreadsheet structural-chunk contract
- place resolution
- verified map metadata
- reservations hub
- map view

## 6. Later runtime APIs

Only after travel-time use is validated:
- weather
- flight status
- live transit
- current location
- opening status

Runtime UI primitives must not depend on fake data before then.

## 7. External Markdown Benchmark #001

Fixture:
Sample #23, unfamiliar Korea/Seoul Markdown.

Pre-Review parser gate:

- zero missing critical events
- zero invented critical events
- zero unsupported exact critical dates/times/places
- every annotated ambiguity surfaced for Review
- valid required interpretation-response schema
- 100% validated evidence-unit accounting
- zero silent omissions
- every unparsed item includes stable locator, reason, severity, and message

Post-Review recovery gate:

- corrected CanonicalTrip passes validation
- renders through the current clean-start Generalized V0 result system
- semantic distinctions survive rendering

## 8. Evaluation metrics

### Parser Quality
- schema validity
- field extraction accuracy
- missing event rate
- false event rate
- unsupported exact fact rate
- ambiguity recall
- semantic preservation

### Review Recovery
- correction count
- correction time
- critical correction rate
- deleted false events
- added missing events
- unresolved ambiguity after confirmation

## 9. Implementation order

```text
1. Canonical schema contract
2. Markdown Source Adapter
3. Executable UnifiedSourceDocument contract + pre-provider gate
4. Source-neutral Review evidence projection
5. Deep Semantic Interpreter contract + Gemini transport adapter
6. Single candidate workflow + bounded processing modal
7. Deterministic Validator
8. Review / User Confirmation
9. Canonical persistence/import
10. Non-overlapping Presentation Projection
11. Overview / Day generalized rendering
12. External Markdown Benchmark #001 against exact `gemini-3.5-flash`
```

Approved implementation order after the shared local pipeline:

```text
→ V0.2 Narrow Spreadsheet Table preparation / experimental intake
→ independent three-layout live spreadsheet acceptance
→ V0.1 Hosted Delivery only after step 12 passes
```

Spreadsheet implementation does not activate an accepted production model or pass the Markdown benchmark. Its supported-format guidance remains gated until all three spreadsheet layouts pass; no region chunking is added without evidence that a complete sheet exceeds budget.

V0.2 spreadsheet work must separate deterministic workbook extraction from
LLM semantic interpretation. The Source Adapter preserves cell values and
relevant table structure; a configured provider API key is required before the
resulting `UnifiedSourceDocument` can be interpreted.

Experimental spreadsheet intake may be exercised after local source/schema/UI verification. It must not be declared supported by UI copy alone: before enabling supported-format guidance, the three live fixtures must prove that Gemini can emit the frozen
`SemanticInterpretationResult` / `ParsedTripDraft` schemas and that invalid or
incomplete output is rejected before Review.

Initial Spreadsheet Travel Table fixture boundary:
- `.xlsx`, UTF-8 `.csv`; `.xls` stays rejected until real-sample extraction acceptance
- maximum 19 visible sheets, based on Sample #19; original-order visible selection defaults to all, requires one and is included in source identity
- ignore hidden sheets
- interpret calculated/cached displayed formula values and retain formulas only
  as source metadata
- do not reject merely irregular layouts; technical extraction failure is
  `unsupported/failed`, while extracted-but-uninterpretable content returns
  schema-valid `insufficient`
- whole-sheet budget preflight precedes every provider call; single-sheet overflow fails explicitly until region chunking is evidenced; all chunk results pass global reconciliation/reference validation before Review
- local acceptance fixtures are Busan (row-per-event), 澎湖 (calendar grid), 名古屋 (column-per-day); local-only runner reads ignored files in place and separates execution, pre-Review parser quality, Review recovery and human rubric assessment
- TODO/missing annotations and unknown rubric metrics remain pending, never zero/pass; no live run without explicit authorization

## 10. Explicit non-goals

Do not add to V0:
- AI planner
- recommendations
- auto-replanning
- route optimization
- expense/budget
- packing
- social
- account system
- complex collaboration
- PDF input parsing
- spreadsheet parsing beyond the gated narrow evidence boundary
- fake runtime data

## 11. Definition of done for V0

V0 is complete when:

> An unfamiliar Markdown itinerary can become a validated, reviewable, user-confirmed CanonicalTrip and render as a useful local Overview + Day interface without materially distorting the source intent.

Completion evidence also requires:
- invalid/unvalidated source documents are rejected before any provider call
- every validated evidence unit has exactly one coverage disposition
- permanently pending processing stages leave the modal through an application deadline or `停止這次判讀`, with timers cleared and the confirmed trip preserved
- exact `gemini-3.5-flash` passes the generated-schema, deterministic parser, and live External Markdown Benchmark #001 gates before production-default activation
- every Day entity has one primary placement and relationship groups preserve complete member semantics without duplicate full rendering

Required engineering checks:
- active application, test, fixture-harness, and tool-configuration source remains `.ts` / `.tsx`
- `npm run typecheck` passes
- `npm run build` passes with typechecking before Vite bundling
- relevant unit, component, and browser flows pass
- `git diff --check` passes
- runtime boundary checks continue to use the authoritative JSON Schemas and deterministic validators
