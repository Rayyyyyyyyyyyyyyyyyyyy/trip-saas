# Trip Runtime — Canonical Product Context
> Status: Product Source of Truth
> Owns: product thesis, invariants, scope/version boundaries, roadmap, validation questions.
## 1. Product thesis
Trip Runtime is a travel execution layer for people who already have an itinerary.
```text
Existing Itinerary
→ Structured Trip
→ Useful Runtime UI
```
Promise:
> Upload what you already have. Open it when you travel.
It does not require users to change how they plan trips.

Current execution is consolidated in
[`complete-faithful-markdown-journey`](../openspec/changes/complete-faithful-markdown-journey/proposal.md).
Its [handoff](../openspec/changes/complete-faithful-markdown-journey/handoff.md)
preserves predecessor evidence and outstanding gates. The review-led correction
has locally implemented and verified faithful unknowns through
confirmation/reload, complete undated content, shared Canonical semantic
validation, minimal provenance compatibility and actual-entry security. This
is implementation evidence, not a claim that live parser quality, deployed
headers, travel-day usefulness or production-model acceptance has passed.
## 2. Core problem
Planning artifacts may live in Markdown, Notes, Excel, PDF, Word, Canva, images, mind maps, booking confirmations, or personal shorthand.
Product hypothesis:
> A confirmed mobile runtime view can reduce the need to reopen the original planning artifact during travel.
## 3. Product boundary
### In scope
- import existing itinerary
- preserve source content + structural signals
- interpret semantics conservatively
- normalize without inventing precision
- deterministic validation
- Review / Correction
- user overrides
- later resolve/enrich existing entities when evidence-gated
- render confirmed semantics
- later attach Runtime Data
### Out by default
- AI trip planning
- recommendation / explore nearby
- route optimization / replanning
- automatic booking
- expense / budget / packing
- social / photo journal / gamification
- general travel chatbot
- complex collaboration
Feature test:
> Does it directly improve Existing Itinerary → Structured Trip → Useful Runtime UI?
If not, defer.
## 4. Architecture invariant
```text
Code reads the source.
LLM understands the intent.
Code verifies the result.
User confirms the truth.
Renderer presents it.
```
The LLM is an implementation of `Semantic Interpreter`, not the whole parser.

Generalized Product V0 uses one Gemini adapter. Other providers/models are a
later optimization, not parallel MVP scope. Exact `gemini-3.5-flash` is the
user-selected exact default candidate. Production remains without an accepted
default until that exact model passes the generated-schema checks,
deterministic parser fixtures, and live External Markdown Benchmark #001. A
later model change reruns the same gates; production does not use a moving alias
or silently fall back to another model.

For spreadsheet sources, the format adapter still owns deterministic
extraction/reconstruction. It must preserve available values and structural
signals before interpretation. Semantic interpretation is LLM-required: the
product must not claim that local rules alone can understand spreadsheet
itinerary meaning.

LLM output is governed by one executable, versioned, provider-neutral
`SemanticInterpretationResult` / `ParsedTripDraft` JSON Schema contract.
Source formats may vary before interpretation, but they do not get separate
post-LLM draft schemas.

Source Adapter output is likewise governed by one executable, versioned
`UnifiedSourceDocument` JSON Schema plus deterministic integrity checks. Only a
validated document may enter semantic interpretation. Its ordered content is
identified through source-neutral evidence units; source-specific structure is
preserved inside constrained variants rather than leaking Markdown AST or
workbook objects across the boundary. Review receives a bounded evidence
projection, not the source document or adapter-private objects.

One application workflow owns candidate source/document, processing stage,
request/session identity, interpretation result, Review state, confirmation,
failure, cancellation, and terminal cleanup. The blocking processing modal is a
projection of that workflow. Application-level stage/overall deadlines cover
reading through local response validation independently of the provider attempt
deadline, and an explicit `停止這次判讀` action aborts the active identity.
Success, insufficient, failure, timeout, and stop all leave the modal, clear
timers, preserve the confirmed trip, and ignore inactive late results.

Active application, test, fixture-harness, and tool-configuration code uses
strict TypeScript (`.ts` / `.tsx`). Production builds must run a no-emit
typecheck before Vite builds. Research and reference samples under `temp/`
remain evidence and are outside this migration boundary.

TypeScript types are an internal compile-time contract, not a substitute for
runtime validation. Versioned JSON Schemas and deterministic validators remain
authoritative for source input, provider output, imported Canonical JSON, and
persisted records. Types must reinforce the Source Adapter, Semantic
Interpreter, CanonicalTrip, Presentation Projection, and Renderer boundaries;
they must not leak source- or provider-specific shapes into downstream layers.

The personal Gemini API key is persisted browser-locally so the user does not
need to re-enter it every session. It is device/browser-scoped, has an explicit
clear action, never enters CanonicalTrip or Canonical JSON, is not synchronized,
and must not be sent to Trip Runtime hosting/storage.
## 5. Data layers
### Source Data
Original artifacts and source trace.
### Trip Data
`Confirmed CanonicalTrip`.
Product-level Source of Truth.
### Runtime Data
Dynamic execution state:
- current time/location
- weather
- flight status
- transit estimate
- opening status
Runtime Data must not mutate CanonicalTrip.
## 6. Processing model
```text
Source
→ Source Adapter
→ UnifiedSourceDocument
→ Executable Source-Document Gate
→ Semantic Interpreter
→ SemanticInterpretationResult
→ Required Response / Reviewable Draft Gates
→ ParsedTripDraft
→ Deterministic Draft Validation
→ Evidence-backed Review
→ Authoritative Candidate Validation
→ User Confirmation
→ Confirmed CanonicalTrip
→ Presentation Projection
→ Source-agnostic Result UI
```
Rule:
```text
Source format → extraction strategy
Canonical semantics → presentation treatment
```
Never:
```text
Source format → Result UI family
```
## 7. Product invariants
### Preserve intent, not layout
Examples:
- `about 10:30` remains approximate
- recommendation does not become commitment
- optional does not become incomplete work
- fallback remains relational
### Conservative interpretation
```text
uncertain
→ preserve source
→ lower confidence
→ surface in Review
→ do not invent
```

### Source coverage accounting
Every validated evidence unit must be accounted for as:
- interpreted Trip Data candidate
- preserved supporting/non-itinerary content
- explicitly unparsed content with source locator + reason

Presentation Projection must give every confirmed canonical entity exactly one
primary placement in its Day display tree. Relationship members may not also
render as duplicate standalone full entities. Overview/fixed-anchor summaries
may hold compact references only; relationship presentation must retain each
member's supported time, place, modifiers, dependencies, notes, unresolved
state, and exact actions.

Silent omission is forbidden. An explicitly unparsed item is incomplete interpretation, not permission to invent a replacement.
Coverage v2 may compress interpreted/supporting intervals; bounded local expansion proves exactly-once evidence accounting before Review. For spreadsheets the expectation covers the selected scope only and names excluded sheets; complete accounting includes unparsed content and is not proof of understanding. Canonical v3 carries optional source-derived supporting groups, with explicit v1/v2 decoder compatibility and no raw source persistence.

### User override precedence
```text
User Override
> Verified External Data
> Parser Result
> Raw Source Inference
```
### Enrichment ≠ recommendation
Verified metadata may enrich an existing itinerary entity.
It may not create new itinerary intent.
### Review = trust boundary
`ParsedTripDraft` is provisional.
Only confirmed, validated `CanonicalTrip` is product truth.
### Runtime degradation
If runtime data fails:
- static itinerary remains usable
- unsupported runtime labels are omitted
- no guessing
## 8. Core semantic preservation
Preserve when present:
- exact / approximate / daypart / no-time / open-ended time
- cross-midnight relation
- free time
- optional
- alternative
- conditional / fallback
- tentative
- unresolved
- reservation/ticket state
- source-provided deadline/buffer
- personal note
- basic participant subgroup
- source trace
- explicit unparsed-source findings during Draft/Review
Supporting data may be classified/preserved without full V0 productization.
## 9. Scope/version boundaries
### Golden Viewer
Real Osaka/Uji/Nara viewer used as Golden Result #001.
May contain:
- Overview / Today / Day
- NOW/NEXT prototypes
- source-derived leave-by
- reservations / directions
- checklist behavior
Golden Viewer capability does not automatically define Generalized Product V0.
### Generalized Product V0 — Understand + Trust
Goal:
> Reliably convert unfamiliar Markdown into confirmed, renderable CanonicalTrip.
```text
Markdown
→ UnifiedSourceDocument
→ ParsedTripDraft
→ Validation
→ Review
→ Confirmed CanonicalTrip
→ Local Overview / Day
```
V0 ends at locally confirmed + renderable trip. The approved execution order now implements the narrow Spreadsheet Travel Table slice before Hosted Delivery. This does not pass the Markdown benchmark or activate a production model; the spreadsheet supported-format declaration has its own three-layout live gate. Current execution details are in [the spreadsheet change handoff](../openspec/changes/add-spreadsheet-intake-and-result-clarity/handoff.md), alongside the Markdown owner above.
### V0.1 — Hosted Delivery Lite
Only after V0 benchmark gate:
```text
CanonicalTrip
→ PublishedTripSnapshot
→ TripPublication
→ Read-only unlisted Viewer
```
The current Golden Viewer also targets Netlify as a static `dist` deployment
through `netlify.toml` and `public/_headers`; this static release path does not
enable publication Functions, Blob storage or any Hosted Delivery behavior.

The selected V0.1 deployment target is Netlify. Lite uses one hosted application for
all viewers rather than one Netlify project/account per traveler. Each
publication has an isolated unlisted slug, immutable snapshot, bounded
lifecycle, and separate recovery verifier; hosted viewers do not require an
account.
### V0.2 — Narrow Spreadsheet Travel Table
Constrained XLSX/CSV Source Adapter using the same
Draft/Review/Canonical pipeline.
The adapter extracts cell values and relevant row/column/merge relationships;
an explicitly configured LLM provider interprets the resulting
`UnifiedSourceDocument`.

Initial evidence boundary:
- experimental `.xlsx` and UTF-8 `.csv`; `.xls` remains rejected until a real sample passes the same extraction gate
- at most 19 visible workbook sheets, matching Sample #19
- hidden sheets ignored
- formula cells use their calculated/cached displayed value for interpretation;
  the formula remains source metadata when available
- CSV is treated as one visible sheet without a selection step
- choose at least one visible sheet in original order before interpretation; hidden sheets never enter extraction or coverage
- displayed text is authoritative; cached serials and date-system hints cannot supply a year absent from cited display text
- 128 MiB file, 50,000 evidence-unit and 20 MB source-document technical limits fail explicitly without truncation
- whole-sheet requests preflight completely and reconcile globally before Review; a single over-budget sheet fails without a provider call until region chunking is justified
- declare spreadsheet support only after Busan, 澎湖 and 名古屋 pass the faithful live rubric independently; successful extraction or a mock response cannot satisfy that gate
### Later
Evidence-driven:
- advanced spreadsheets
- visual sources and mind maps
- place resolution
- richer runtime
- account / multi-trip / billing / cross-device ownership

PDF input is not a supported or planned Source Adapter. PDF export of a
confirmed Result is a separate later archival capability and does not imply PDF
import support.

Spreadsheet processing requires a valid Gemini API key. Without one, intake
may explain the requirement and route the user to credential setup, but it must
not begin interpretation or silently fall back to a local-only semantic parser.
A confirmed trip remains readable without any provider credential.
## 10. UI direction
Current MVP Result UI thesis:
```text
Chinese Newspaper Editorial
×
Runtime Clarity
×
Travel-day Utility
```
Current UI design scope:
- Overview
- Day
- semantic hierarchy
- flexible/optional/transit treatments

The September 2026 mobile and desktop prototypes under
`temp/Mobile app and web design/` replace the earlier warm, rounded prototype
as the approved visual reference. The durable UI authority is
`spec/06_RESULT_UI_SPEC.md` after prototype decisions are synchronized there.

Approved surface language:

- white paper, black ink, Chinese editorial serif hierarchy
- `Noto Serif TC` for reading/identity and `Noto Sans TC` for time, metadata,
  labels, and controls
- hierarchy through type, whitespace, and thin rules rather than cards
- no rounded containers, shadows, large semantic fills, or dark-mode contract
- semantic color only as a restrained 4px rule or text marker
- time sits directly before the event title in small tabular utility type
- mobile horizontal date blocks; selected date is black with white text
- desktop keeps the primary reading measure at approximately 680px even when
  navigation or supporting context is visible

Implementation acceptance still requires clean-start validation of:
- mobile/desktop behavior
- accessibility and control sizing
- overflow and keyboard navigation
- light-mode contrast and semantic stress states
- implementation fidelity to the frozen prototype color/font-family tokens

The prototype is not a product-scope authority. It does not enable PDF or
Spreadsheet support by itself; the experimental slice is authorized by its implementation change. It cannot change browser-local Gemini credential persistence,
add a local semantic-parser fallback, remove Canonical JSON import, remove the
gated Hosted Delivery roadmap, or generalize Today into V0.

Today runtime composition is a separate runtime UI track.
## 11. Evidence state
```text
Formal input samples: 26
External Markdown benchmark fixtures collected: 1
External Markdown benchmark gates passed: 0
Response reference pairs: 1
Cross-format semantic saturation: approaching, not declared
Markdown V0 evidence: sufficient to implement
```
Acceptance fixture:
Sample #23, Korea/Seoul Markdown.
## 12. Status classification

`Confirmed` below means the product/architecture decision is authoritative. It
does not mean every contract is already implemented in the checked-in runtime.
Implementation completion remains governed by the active OpenSpec change and
its verification gates.

### Confirmed product contracts
- product thesis/boundary
- three-layer data model
- pipeline ownership
- user override precedence
- source-agnostic Renderer
- Review trust layer
- executable source-document gate and source-neutral evidence ownership
- one application candidate-workflow owner and bounded processing-modal contract
- exact `gemini-3.5-flash` as the benchmark-gated default candidate
- unique primary Result placement and complete relationship-member presentation
- Markdown V0 evidence boundary
- Overview/Day surface scope and semantic direction

### Verified current implementation behavior
- the Gemini adapter has a per-attempt request/body-read deadline, cancellation propagation, bounded `429`/`503` retry, and safe provider/transport failure translation
- local structured-response, coverage, and Reviewable Draft gates reject malformed or non-reviewable output before Review
- the tested provider-timeout and malformed-output paths release the blocking modal, preserve retryable source input, and leave the confirmed trip unchanged
- successful Gemini output enters Review and cannot render or replace the active trip before authoritative confirmation and persistence commit
- supported unknown trip/Day dates survive confirmation, persistence and reload without fabricated precision
- confirmation, Canonical JSON import and repository reads/writes share authoritative calendar, time-shape, identity and reference checks
- every dated or undated canonical entity receives one complete primary placement, including relationship members and exact source actions
- Canonical v2 persists only the approved minimal provenance allowlist and decodes/migrates compatible v1 records without changing trip/checklist identity
- the Netlify static artifact carries a strict response-header CSP declaration plus a compatible HTML meta fallback; `frame-ancestors` depends on the unverified live Netlify response and remains a release-verification gap

### Locally verified boundary hardening — 2026-09-07
- executable source-document JSON Schema and deterministic pre-provider integrity gate
- provider-neutral interpretation module owns schema, coverage and Reviewable Draft gates; Gemini owns transport
- sole application ownership of candidate progress and terminal state
- application stage/overall watchdog plus visible `停止這次判讀`
- inactive late-result rejection across every processing stage
- ordered non-overlapping Day display tree with one primary placement per entity
- explicit sample routing; imported/persisted Golden-ID trips render their supplied CanonicalTrip

Local unit, component and mobile/desktop browser evidence is recorded in
[`validation.md`](../openspec/changes/archive/2026-09-07-harden-source-to-render-boundaries/validation.md).
This verifies the working implementation, not deployment or live parser quality.

### Remaining external acceptance gate
- production-default activation for exact `gemini-3.5-flash`; activation remains blocked until the generated-schema, deterministic parser, and key-backed live External Markdown Benchmark #001 gates pass

### Available reference implementation
- current Osaka/Uji/Toei Kyoto Studio Park (太秦) viewer
- runtime-oriented prototype behavior
### Unvalidated
- generic parser quality
- live `gemini-3.5-flash` parser/model acceptance and production-default activation
- human Review burden (captured-output correction evidence is local and controlled)
- qualifying original unfamiliar-Markdown E2E acceptance
- current clean-start Overview/Day implementation and usability
- travel-time replacement of source docs
- willingness to pay
- business model
- product-vs-feature risk
## 13. Product hypotheses
### Runtime value
Will users stop reopening the source itinerary?
### Review tolerance
Is correction burden low enough?
### WTP
Is itinerary-to-runtime conversion worth paying for?
### Product vs feature
Can general AI tools absorb the value?
### Frequency
Is consumer trip frequency too low?
### B2B
Would travel operators gain more from white-label runtime itineraries?
## 14. Kill questions
1. Feature or product?
2. Why not ChatGPT / Claude / Notion?
3. Is the source actually painful during travel?
4. Does Review friction erase value?
5. Are parser/layout/resolution costs too high?
6. Is B2C frequency too low?
7. Is WTP real?
8. Is B2B stronger?
9. Is Golden Viewer only useful to its creator?
10. What result should make us stop?
## 15. Highest-level acceptance
> During travel, users should no longer need to reopen the original itinerary document.
