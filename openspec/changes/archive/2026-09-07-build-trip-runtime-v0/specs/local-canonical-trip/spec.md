## ADDED Requirements

### Requirement: Confirmed CanonicalTrip is local product truth
Only a schema-valid, authoritatively validated, user-confirmed CanonicalTrip SHALL become active product truth. Parsed drafts, raw provider responses, UI styling, runtime data, and provider metadata MUST NOT be stored in CanonicalTrip.

#### Scenario: Draft exists but is not confirmed
- **WHEN** a valid ParsedTripDraft is in Review
- **THEN** it remains provisional and cannot open Overview/Day as the active trip

### Requirement: One active trip and one candidate session
The application SHALL support at most one persisted active confirmed trip and one separate in-memory candidate import/review session. It MUST NOT present these states as a persisted multi-trip library.

#### Scenario: Replacement import starts
- **WHEN** an active trip exists and the user starts another Markdown import
- **THEN** the active trip remains readable while one separate candidate session advances through the workflow

### Requirement: Atomic active-trip replacement
Replacement SHALL validate and persist the candidate plus active identity atomically before clearing the candidate or showing success. Failure or stale responses MUST leave the prior active trip unchanged.

#### Scenario: Replacement transaction commits
- **WHEN** a confirmed replacement is valid and persistence commits
- **THEN** exactly the replacement trip becomes active across Home, success, Overview, and Day and the candidate state is cleared

#### Scenario: Replacement transaction fails
- **WHEN** persistence cannot commit the replacement
- **THEN** the prior trip remains the active record and no surface reports the candidate as active

#### Scenario: Stale response arrives
- **WHEN** an earlier import response arrives after a newer session has become current
- **THEN** it is ignored and cannot replace active or candidate state

### Requirement: Validated startup loading
On startup the application SHALL load and validate the persisted active record before entering Viewer. A missing, unsupported-version, malformed, or invalid record SHALL not enter Result UI and SHALL expose Home/recovery behavior.

#### Scenario: Valid active trip reloads
- **WHEN** a supported valid active CanonicalTrip exists
- **THEN** reload opens the existing Viewer without requiring a Gemini key

#### Scenario: Persisted record is invalid
- **WHEN** the active record fails schema or authoritative validation
- **THEN** Viewer does not consume it and the application offers a recovery/clear/sample path

### Requirement: Canonical JSON import without parsing
V0 SHALL accept a supported schema-version CanonicalTrip JSON file, validate only the allowlisted CanonicalTrip shape and semantics, and activate it through the same safe transaction without Gemini parsing or Review. Invalid imports MUST NOT modify the active trip.

#### Scenario: Valid Canonical JSON import
- **WHEN** the user imports a valid supported CanonicalTrip JSON file
- **THEN** it is authoritatively validated and transactionally activated without a provider credential

#### Scenario: Import contains non-trip fields
- **WHEN** an imported JSON document includes provider metadata, raw source, Review evidence, or another unknown member
- **THEN** the import is rejected by the strict CanonicalTrip contract and none of those values are persisted

#### Scenario: Unsupported schema version
- **WHEN** imported Canonical JSON uses an unsupported schema version
- **THEN** the system explains the incompatibility and preserves the active trip

### Requirement: No Canonical JSON export in V0
Generalized Product V0 SHALL NOT expose Canonical JSON export. Import exists only as the approved portability/recovery entry path for an already valid CanonicalTrip.

#### Scenario: User inspects V0 data actions
- **WHEN** the user opens local trip management controls
- **THEN** Canonical JSON import is available and Canonical JSON export is absent

### Requirement: Separate clearing scopes
The application SHALL expose explicit, separately described actions for clearing trip data, clearing the Gemini credential, and clearing all local data. One scoped clear MUST NOT silently clear another scope.

#### Scenario: Clear trip data only
- **WHEN** the user confirms clearing trip data
- **THEN** the active trip and trip-scoped state are removed while the Gemini credential remains stored

#### Scenario: Clear credential only
- **WHEN** the user confirms clearing the Gemini key
- **THEN** the credential is removed while the active trip and Viewer remain available

### Requirement: Trip-scoped checklist compatibility
Checklist/readiness state SHALL use the active trip identity as its storage scope. Existing Osaka state under `osaka-trip-todos` SHALL be migrated and kept synchronized so current traveler data is not lost.

#### Scenario: Legacy Osaka checklist is present
- **WHEN** the Golden Osaka trip first loads with existing `osaka-trip-todos` data
- **THEN** the values are migrated to the trip-scoped record and both keys remain synchronized according to the compatibility contract

### Requirement: Session-only sensitive source state
Raw uploads, pasted source text, UnifiedSourceDocument blocks, source excerpts, full provider responses, and ReviewSession evidence SHALL remain session-scoped unless a separate explicit contract is approved.

#### Scenario: Confirmed trip is persisted
- **WHEN** confirmation succeeds
- **THEN** only allowlisted CanonicalTrip and approved trip-scoped state are durably stored, not the source or ReviewSession payloads

#### Scenario: Candidate session ends and application reloads
- **WHEN** an import or Review session is cancelled, fails, or completes and the application reloads
- **THEN** raw source content, source excerpts, full provider responses, and ReviewSession state are absent from durable browser storage
