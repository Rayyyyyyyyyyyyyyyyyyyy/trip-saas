## MODIFIED Requirements

### Requirement: Non-content provenance has explicit compatibility
Confirmed source-authored entities SHALL retain bounded opaque source identity and source-neutral locator references under an explicitly versioned allowlist. User-authored and legacy-unavailable provenance MUST be distinguishable without fabricated source claims. Raw source, filenames/excerpts embedded as identity, evidence documents and provider data MUST NOT enter durable provenance. New writes SHALL use strict `canonical-trip.v3`; supported strict v2 and v1 values SHALL decode non-destructively. Migration failure MUST preserve the prior record and active pointer.

#### Scenario: Source-authored entity is confirmed
- **WHEN** the current validated source identity and entity evidence-unit IDs are available
- **THEN** only those opaque IDs survive reload and raw evidence remains absent

#### Scenario: Existing v1 source entity is loaded
- **WHEN** its old provenance has no source identity or locator
- **THEN** it becomes `legacy_unavailable` without fabricated provenance or changed trip/checklist IDs

#### Scenario: Existing v2 trip is loaded
- **WHEN** a persisted `canonical-trip.v2` trip without supporting groups is loaded
- **THEN** it decodes with every supporting item's `group` set to null and its entities, checklist IDs, and active pointer are unchanged

## ADDED Requirements

### Requirement: Supporting items retain a confirmed group
Each supporting item SHALL carry a source-neutral `group` that is either null or `{ id, label, order }`, where `label` is the user-visible category from the source (spreadsheet sheet name, or the owning Markdown heading). The group SHALL be confirmed through Review and persisted with CanonicalTrip. All items that share a group id MUST share the same label and order, and groups MUST NOT be merged by label alone. UI disclosure state (collapsed or expanded) MUST NOT be persisted in CanonicalTrip.

#### Scenario: Food-list sheet is confirmed
- **WHEN** a trip whose supporting items came from a sheet named `美食清單` is confirmed and reloaded
- **THEN** those items keep one group labeled `美食清單` in its original order

#### Scenario: Two sheets share a name pattern
- **WHEN** two different sheets produce groups with the same label
- **THEN** they remain distinct groups with distinct ids
