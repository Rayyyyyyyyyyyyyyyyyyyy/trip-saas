## ADDED Requirements

### Requirement: Fixed source-agnostic presentation grammar
Presentation Projection SHALL deterministically map validated CanonicalTrip semantics to a finite presentation grammar and SHALL NOT inspect source format, source documents, provider output, Review state, or provider metadata. The Renderer SHALL switch only on presentation roles and SHALL NOT allow an LLM to select components, layout, styling, or UI fields.

#### Scenario: Equivalent semantics come from different formats
- **WHEN** Markdown and a later spreadsheet source produce equivalent confirmed CanonicalTrip semantics
- **THEN** Presentation Projection emits equivalent presentation roles and the same Result templates are used

### Requirement: Ordered non-overlapping Day display tree
Each projected Day SHALL expose an ordered display tree whose items have discriminated presentation roles. Every canonical entity MUST have exactly one primary placement in that Day; an entity MUST NOT render once as an independent timeline item and again as a full member of a relationship group.

#### Scenario: Alternative members are projected
- **WHEN** two entities belong to one alternative relationship
- **THEN** both entities have their primary placement inside one alternative-group item and do not also appear as independent timeline items

#### Scenario: Fixed-anchor summary references an entity
- **WHEN** a primary timeline entity is also selected for the fixed-anchor summary
- **THEN** the summary may show a compact reference while the full entity retains exactly one primary placement

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
