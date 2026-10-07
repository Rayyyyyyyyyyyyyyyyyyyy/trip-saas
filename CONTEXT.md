# Trip Runtime Domain Language

Trip Runtime converts an existing itinerary `Source` into user-confirmed trip truth and presents that truth for travel execution. This glossary defines the ubiquitous language used by humans, agents, contracts, and code; behavioral authority remains in [`spec/00_README.md`](./spec/00_README.md).

## Source understanding

**Source**:
The user-provided itinerary artifact entering the pipeline.
_Avoid_: Input file, raw itinerary, upload document

**Source Adapter**:
The source-format boundary that reconstructs content and structural evidence without deciding trip meaning.
_Avoid_: Parser, importer, renderer

**UnifiedSourceDocument**:
The executable, versioned, source-neutral representation of ordered evidence units, structure, locators, links, assets, and extraction findings emitted by a Source Adapter.
_Avoid_: Parsed trip, CanonicalTrip, plain-text dump

**ValidatedUnifiedSourceDocument**:
A `UnifiedSourceDocument` that passed its JSON Schema plus deterministic identity, ordering, locator, reference, hierarchy, and configured-size gates and is therefore eligible for interpretation.
_Avoid_: Adapter output, unchecked source JSON, ParsedTripDraft

**Evidence Unit**:
A stable source-neutral identity for one ordered unit of extracted source evidence. Its discriminated structural evidence may be Markdown- or tabular-specific without leaking adapter objects downstream.
_Avoid_: Event, canonical entity, generic block

**Selected-sheet Scope**:
The normalized original-order visible worksheet selection included in source identity and expected evidence accounting. User-excluded sheets are named but are not counted as covered.
_Avoid_: Whole-workbook understanding, hidden-sheet count

**Range Disposition**:
A response-v2 inclusive ordered evidence interval marked interpreted or supporting, expanded locally before response gates. Every evidence identity is still accounted for once.
_Avoid_: Truncated source, semantic confidence, range of trip dates

**Prepared Source**:
The session-only validated source input/document retained by the application for unchanged-source retry, with fresh request ownership and credential loading.
_Avoid_: Review candidate, candidate model, persisted upload

**Semantic Interpreter**:
The boundary that interprets travel intent, relations, uncertainty, and content roles from a `UnifiedSourceDocument`.
_Avoid_: Whole parser, planner, renderer

**SemanticInterpretationResult**:
The provider-neutral interpretation outcome containing either a `ParsedTripDraft` or an explicit insufficient result, plus findings and complete source coverage.
_Avoid_: AI response, parse JSON, final trip

**ParsedTripDraft**:
The provisional structured trip candidate produced by interpretation and not yet accepted as truth.
_Avoid_: CanonicalTrip, confirmed trip, final data

**Finding**:
A structured statement about ambiguity, conflict, unsupported precision, missing structure, or another condition requiring validation or Review visibility.
_Avoid_: Generic error, AI note

**Supporting Content**:
Source material useful for trip execution or traceability that is not itself itinerary intent.
_Avoid_: Noise, ignored content, event

**Supporting Group**:
An optional confirmed reference grouping with stable identity, exact source-derived label and source order. It is derived after response validation, not invented by the provider. Disclosure state belongs to presentation.
_Avoid_: Event group, source-specific renderer

**Review Evidence Projection**:
The deterministic, bounded presentation of validated source references used by Review, such as text excerpts, tabular excerpts, asset references, missing references, or user-authored evidence.
_Avoid_: Raw source document, workbook view, provider response

## Trust and trip truth

**Deterministic Draft Validation**:
Machine-checkable validation of schema, references, dates, times, ranges, and coverage before Review.
_Avoid_: Semantic interpretation, user approval

**Review**:
The evidence-backed trust boundary where the user inspects, corrects, adds, removes, and approves interpreted intent.
_Avoid_: Editor, planner, confirmation

**Authoritative Candidate Validation**:
The final validation of the reviewed candidate immediately before confirmation and persistence.
_Avoid_: Draft validation, parser validation

**CanonicalTrip**:
The schema-defined representation of trip meaning, excluding raw source, interpretation metadata, runtime state, and presentation-only fields.
_Avoid_: ParsedTripDraft, source document, presentation model

**Confirmed CanonicalTrip**:
The validated, user-confirmed `CanonicalTrip` that is the active browser-local Source of Truth.
_Avoid_: ParsedTripDraft, parser output, presentation model

**User Override**:
A user-authored correction whose authority is higher than parser inference or later enrichment.
_Avoid_: Parser edit, enrichment

## Presentation and runtime

**Presentation Projection**:
The deterministic mapping from confirmed trip semantics to source-agnostic presentation semantics, including one ordered Day display tree with one primary placement per canonical entity.
_Avoid_: Renderer, UI styling, source parser

**Renderer**:
The boundary that renders projected semantics with optional `Runtime Data` and never reads raw Source or `UnifiedSourceDocument` content.
_Avoid_: Source Adapter, Semantic Interpreter, Presentation Projection

**Result UI**:
The source-agnostic interface that presents projected trip semantics.
_Avoid_: Markdown view, spreadsheet view, parser output

**Runtime Data**:
Dynamic execution context such as current time, location, weather, flight status, or transit estimates; it never becomes `CanonicalTrip` truth.
_Avoid_: Trip Data, Source Data, enrichment

**Golden Viewer**:
The real Osaka/Uji/Nara viewer used as Golden Result #001 and as a reliable traveler fallback.
_Avoid_: Generalized Product V0, demo

**Golden Input / Golden Result**:
A known source fixture and its reference outcome used to detect regression, not to prove generalization.
_Avoid_: Benchmark proof, production corpus

**Generalized Product V0**:
The Markdown-first trust pipeline that ends at a locally confirmed and renderable `CanonicalTrip`.
_Avoid_: Golden Viewer, Hosted Delivery

## Hosted delivery

**PublishedTripSnapshot**:
An immutable, schema-versioned, viewer-safe projection of a confirmed `CanonicalTrip`.
_Avoid_: CanonicalTrip, publication record

**TripPublication**:
The lifecycle record controlling where, whether, and until when a snapshot is published, without containing trip content.
_Avoid_: PublishedTripSnapshot, hosted trip data
