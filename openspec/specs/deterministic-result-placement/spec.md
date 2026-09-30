# Deterministic Result Placement Specification

## Purpose

Define the source-agnostic presentation grammar and deterministic, non-overlapping placement contract consumed by Result UI.

## Requirements

### Requirement: Fixed source-agnostic presentation grammar
Presentation Projection SHALL deterministically map validated CanonicalTrip semantics to a finite presentation grammar and SHALL NOT inspect source format, source documents, provider output, Review state, or provider metadata. The Renderer SHALL switch only on presentation roles and SHALL NOT allow an LLM to select components, layout, styling, or UI fields.

#### Scenario: Equivalent semantics come from different formats
- **WHEN** Markdown and a later spreadsheet source produce equivalent confirmed CanonicalTrip semantics
- **THEN** Presentation Projection emits equivalent presentation roles and the same Result templates are used

### Requirement: Ordered non-overlapping Day display tree
Each projected Day SHALL expose an ordered display tree whose items have discriminated presentation roles. Every canonical entity MUST have exactly one primary placement across the trip: in its associated Day tree or in an accessible undated trip-information tree when its Day reference is null. An entity MUST NOT render once independently and again as a full relationship member. Compact summaries MUST NOT substitute for the entity's complete primary presentation.

#### Scenario: Alternative members are projected
- **WHEN** two entities belong to one alternative relationship
- **THEN** both entities have their primary placement inside one alternative-group item and do not also appear as independent timeline items

#### Scenario: Fixed-anchor summary references an entity
- **WHEN** a primary timeline entity is also selected for the fixed-anchor summary
- **THEN** the summary may show a compact reference while the full entity retains exactly one primary placement

#### Scenario: An activity or flight has no supported Day
- **WHEN** a confirmed entity has a null Day reference
- **THEN** its full supported time, place, notes, dependencies and actions remain reachable in undated trip information without a fabricated Day or duplicate full copies

#### Scenario: A relationship spans dated and undated members
- **WHEN** a representable alternative, conditional, parent-child or sequence relationship spans multiple placement regions
- **THEN** each member keeps one primary placement and each fragment preserves relationship identity/context with references to other members rather than invented chronology or duplicated full entities

### Requirement: Complete relationship-member presentation
Alternative, conditional, fallback, and parent/child relationship templates SHALL preserve each member's supported time precision, place, semantic modifiers, dependencies, notes, unresolved state, and exact actions. Relationship presentation MUST NOT reduce confirmed member semantics to title-only copies.

#### Scenario: Alternative member has a reservation and map action
- **WHEN** an alternative member contains reservation readiness and an exact source-provided map URL
- **THEN** the relationship group exposes both through the same safe semantic treatments available to a standalone entity

### Requirement: Deterministic relationship placement conflicts
The projection/validation pipeline SHALL resolve representable relationship composition deterministically. If one entity belongs to multiple incompatible primary relationship groups that cannot be nested by the Canonical relationship model, authoritative validation MUST emit a blocking finding before confirmation rather than duplicate or silently choose a placement.

#### Scenario: Entity belongs to incompatible alternative groups
- **WHEN** one entity is assigned to two primary alternative groups without a supported nesting relation
- **THEN** confirmation is blocked with a structured relationship-placement finding

### Requirement: Sequence and connector semantics remain structural
Sequence relationships SHALL determine reading order without requiring a second full rendering of their members. Transit SHALL render as a connector by default, but a source-supported critical booked transport entity MUST remain eligible for prominent entity treatment with its dependencies and actions intact.

#### Scenario: Sequence orders existing items
- **WHEN** a sequence relationship connects three entities already placed in the Day display tree
- **THEN** Projection orders those primary items and does not add a duplicate sequence group containing full copies

#### Scenario: Critical booked transport
- **WHEN** a transport entity has source-supported fixed timing and booking/readiness significance
- **THEN** Projection may use a prominent transport presentation instead of stripping it to a title-only connector

### Requirement: Renderer consumes presentation only
Result UI SHALL consume the Presentation Projection and optional supported Runtime Data only. It MUST NOT read CanonicalTrip directly, raw Markdown, tabular source objects, extracted evidence units, provider responses, or Review excerpts.

#### Scenario: Day renders relationship content
- **WHEN** a Day display tree contains entity, transit, flexible, and relationship-group items
- **THEN** the Renderer renders the fixed template for each role without consulting source or provider representations

### Requirement: Complete trip presentation is validated across regions
Projection verification SHALL account for every canonical entity ID across all dated and undated primary regions. Supporting content SHALL remain reachable through an appropriate secondary surface. The Renderer MUST remain source-agnostic and retain approved newspaper tokens, semantic precision and mobile/desktop access parity.

#### Scenario: A valid trip contains unknown dates and supporting guidance
- **WHEN** the trip is confirmed and reopened at mobile and desktop widths
- **THEN** all entity IDs have one complete primary placement, all supported notes/actions remain accessible and original ambiguous times are readable without inferred precision
