## ADDED Requirements

### Requirement: Supported unknown facts survive confirmation and reload
The system SHALL allow schema-supported unknown trip/day dates, place facts and other nullable values through authoritative confirmation, storage, reload and presentation when minimum itinerary structure is valid. It MUST NOT require users to invent source-absent facts. TypeScript contracts and UI fallback handling MUST agree with executable schema nullability.

#### Scenario: Source provides partial dates without a year
- **WHEN** a reviewable itinerary has ordered Days and source-supported partial labels but null full trip/day dates
- **THEN** the user can confirm, persist and reopen it with those labels and unknown dates intact, without a guessed year or unsupported runtime label

#### Scenario: Optional trip identity is absent
- **WHEN** a supported nullable title or place field is absent
- **THEN** Home and Result remain readable using neutral presentation-only fallback text without writing invented facts into CanonicalTrip

### Requirement: Canonical trust entries enforce semantic integrity
Confirmation, Canonical JSON import and persisted-record loading/writing SHALL apply shared authoritative calendar, trip/day range, time-shape, rollover, identity, reference and relationship checks. Allowed unknowns MUST remain valid; malformed known values MUST NOT be coerced or accepted merely because their JSON shape matches.

#### Scenario: Calendar or time semantics are invalid
- **WHEN** imported or stored data contains an impossible calendar date, reversed trip range, invalid day range, exact time with no start, or inconsistent cross-midnight shape
- **THEN** the entry rejects it with bounded recovery behavior before activation and preserves the prior active trip

#### Scenario: Valid undated information is present
- **WHEN** an otherwise valid trip contains an entity with null Day association and supported raw time or place text
- **THEN** validation preserves the entity without requiring a guessed association

### Requirement: Non-content provenance has explicit compatibility
Confirmed source-authored entities SHALL retain bounded opaque source identity and source-neutral locator references under an explicitly versioned allowlist. User-authored and legacy-unavailable provenance MUST be distinguishable without fabricated source claims. Raw source, filenames/excerpts embedded as identity, evidence documents and provider data MUST NOT enter durable provenance. Existing supported records and imports SHALL have a documented, validated compatibility path before changing the stored schema.

#### Scenario: Source-authored entity is confirmed
- **WHEN** the user confirms an interpreted entity with available source references
- **THEN** its allowed trace reference survives reload while the Review evidence payload remains absent from storage and Result cannot use provenance for layout

#### Scenario: Existing v1 data has no locator
- **WHEN** a supported legacy trip is loaded or imported after the provenance change
- **THEN** the compatibility path preserves itinerary/checklist identity, represents unavailable provenance explicitly and never guesses a locator or clears the active trip on migration failure
