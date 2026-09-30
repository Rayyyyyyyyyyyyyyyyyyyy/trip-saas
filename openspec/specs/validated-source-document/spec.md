# Validated Source Document Specification

## Purpose

Define the executable, source-neutral contract and deterministic gate that every Source Adapter must satisfy before semantic interpretation, plus the bounded evidence projection used by Review.

## Requirements

### Requirement: Executable source-document contract
Every Source Adapter output SHALL conform to one executable, versioned `UnifiedSourceDocument` JSON Schema before it can enter semantic interpretation. The schema SHALL require explicit source identity, format identity, ordered evidence units, stable locators, extraction findings, declared members, and SHALL reject unknown top-level and evidence-unit members.

#### Scenario: Valid Markdown extraction
- **WHEN** the Markdown Source Adapter preserves all supported blocks, links, hierarchy, locators, and findings in a schema-valid document
- **THEN** the source-document gate accepts the document as a validated interpretation input

#### Scenario: Adapter returns an unknown member
- **WHEN** a Source Adapter output contains a provider field, UI field, or another undeclared member
- **THEN** the source-document gate rejects it before any provider request begins

### Requirement: Deterministic pre-interpretation integrity gate
The source-document gate MUST validate source-ID agreement, unique evidence-unit IDs, stable source order, valid parent/header references, required locators, hierarchy/reference integrity, and configured byte/token limits. A failure MUST produce a bounded source/preflight failure, MUST NOT call Gemini, and MUST preserve the current active trip.

#### Scenario: Duplicate evidence identifier
- **WHEN** two evidence units use the same stable ID
- **THEN** interpretation does not start and the user receives a recoverable source-document failure without changing the active trip

#### Scenario: Request exceeds configured limits
- **WHEN** a valid document cannot fit within the configured request byte or token budget
- **THEN** the system stops before provider transmission and reports that the source exceeds the safe interpretation limit

### Requirement: Source-neutral evidence units
`UnifiedSourceDocument` SHALL express source content through source-neutral evidence-unit identity plus discriminated, schema-constrained structural evidence. Markdown and future tabular variants MUST preserve their native structural signals without changing `SemanticInterpretationResult`, `ParsedTripDraft`, CanonicalTrip, or Result contracts.

#### Scenario: Markdown block becomes evidence
- **WHEN** the Markdown Adapter extracts a heading, paragraph, list item, table, or asset reference
- **THEN** it emits a stable evidence unit whose Markdown structure and original locator remain available without exposing a Markdown AST downstream

#### Scenario: Tabular variant remains gated
- **WHEN** the source-document schema contains a declared tabular evidence variant but no accepted Spreadsheet Source Adapter is enabled
- **THEN** the application continues rejecting XLSX/XLS/CSV intake and does not imply spreadsheet support

### Requirement: Complete evidence coverage expectation
Interpretation coverage SHALL be derived from the validated document's evidence-unit IDs. Every evidence unit MUST receive exactly one `interpreted`, `supporting`, or `unparsed` disposition, and every unparsed disposition MUST retain a stable locator, reason, severity, and user-readable message.

#### Scenario: Evidence unit is omitted by provider output
- **WHEN** a provider response lacks a disposition for one validated evidence unit
- **THEN** the response fails the coverage gate and cannot enter Review or confirmation

### Requirement: Source-neutral Review evidence projection
Review SHALL consume a deterministic evidence presentation derived from validated source references and SHALL NOT read Markdown AST nodes, workbook objects, adapter-private types, or raw provider envelopes. The evidence grammar SHALL support text excerpts, tabular excerpts, asset references, missing references, and user-authored items.

#### Scenario: Markdown finding displays evidence
- **WHEN** a Review finding references a Markdown evidence unit
- **THEN** Review shows its stable locator and original text through the text-excerpt template

#### Scenario: User-added entity has no source reference
- **WHEN** the user adds an entity during Review
- **THEN** Review uses the user-authored evidence template and does not fabricate a source excerpt

### Requirement: Source documents remain session-only
Raw source input, validated `UnifiedSourceDocument`, source evidence projections, and extraction findings MUST remain candidate-session data and MUST NOT enter confirmed-trip persistence, Canonical JSON, publication payloads, or Result UI.

#### Scenario: Candidate is confirmed
- **WHEN** a reviewed candidate successfully becomes the active CanonicalTrip
- **THEN** only the validated CanonicalTrip crosses into confirmed-trip persistence and source-document data is discarded with the candidate session
