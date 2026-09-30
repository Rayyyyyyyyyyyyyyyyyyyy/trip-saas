## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Complete trip presentation is validated across regions

Projection verification SHALL account for every canonical entity ID across all dated and undated primary regions. Supporting content SHALL remain reachable through an appropriate secondary surface. The Renderer MUST remain source-agnostic and retain approved newspaper tokens, semantic precision and mobile/desktop access parity.

#### Scenario: A valid trip contains unknown dates and supporting guidance

- **WHEN** the trip is confirmed and reopened at mobile and desktop widths
- **THEN** all entity IDs have one complete primary placement, all supported notes/actions remain accessible and original ambiguous times are readable without inferred precision

### Requirement: Result navigation and degraded assets remain readable

Result SHALL present a recognizable source-supported month/day expression from
the confirmed Day label when its full date is null, without inventing a year or
enabling date-dependent runtime status. Persistent Viewer controls and the Day
date rail MUST NOT overlap at supported mobile, tablet or desktop widths.
Unavailable relative-image supporting items SHALL retain their Canonical source
text while Result presents a human-readable missing-attachment placeholder
instead of exposing raw Markdown image syntax as the primary label.

#### Scenario: Confirmed Days retain month/day but no year

- **WHEN** a confirmed trip has null full dates and Day labels such as `第一天 (6/25)`
- **THEN** Result date navigation shows `6/25` without a `日期未定` prefix, while Canonical dates remain null and no date-dependent runtime state is inferred

#### Scenario: Result controls share the mobile top region

- **WHEN** a Day view renders at any supported width with a horizontal or vertical date rail
- **THEN** the `行程總覽` and `首頁` controls remain reachable without intersecting any date-rail control

#### Scenario: A relative Markdown image was unavailable at intake

- **WHEN** an unresolved `asset` supporting item has no usable URL and retains text such as `![image.png](image.png)`
- **THEN** Result identifies the missing image attachment in plain language, does not render the raw Markdown syntax as its heading and keeps the persisted Canonical item unchanged
