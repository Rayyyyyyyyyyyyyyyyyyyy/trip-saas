# Evidence-Backed Trip Review Specification

## Purpose

Define Review evidence and findings, correction parity across mobile and desktop, user overrides, authoritative validation, confirmation, and candidate cancellation and recovery behavior.

## Requirements

### Requirement: Review requires a reviewable draft
The system SHALL enter normal Review only for a schema-valid, coverage-complete `draft` result that contains at least one supported trip/day structure and one linked itinerary entity with all blocking structural requirements resolved.

#### Scenario: Interpretation is insufficient
- **WHEN** Gate A passes but the Reviewable Draft gate fails
- **THEN** the user receives bounded structural recovery or replace-source actions and cannot enter normal Review or confirm

### Requirement: Single-column evidence-first composition
Mobile and desktop Review SHALL use the same centered single-column reading flow. Every material finding or correction surface SHALL present a read-only source excerpt and stable source identity before the interpretation or question it supports.

#### Scenario: User reviews an interpreted event on desktop
- **WHEN** an interpreted event is opened in desktop Review
- **THEN** the same evidence-first content and correction actions available on mobile are shown in a wider single-column composition rather than a separate full-source split pane

### Requirement: Material findings remain visible
Review SHALL individually expose blocking errors, warnings, ambiguities, low-confidence interpretations, broken evidence, preserved references, unparsed items with reasons, conflicts, and user overrides. It MUST NOT hide these behind a single confidence percentage or completion count.

#### Scenario: Draft contains unparsed non-blocking content
- **WHEN** a reviewable draft includes a non-blocking unparsed item
- **THEN** Review shows its excerpt/locator, reason, severity, and message before confirmation

### Requirement: Complete correction actions
On mobile and desktop the user SHALL be able to edit date/day, title, semantic type, note, place text, time value and supported precision; independently toggle optional, tentative, and flexible; add a parser-missed entity; and delete a parser-created false entity.

#### Scenario: User corrects several fields
- **WHEN** the user changes an event title, approximate time, place text, and flexible flag
- **THEN** the candidate reflects every change and Review visibly identifies the changed values as user-authored

#### Scenario: User adds a missed entity
- **WHEN** the user adds an entity omitted by the parser
- **THEN** it receives a stable identity, explicit supported/null values, user-authored provenance, and authoritative validation before confirmation

#### Scenario: User deletes a false entity
- **WHEN** the user deletes a parser-created mistake
- **THEN** it is absent from the confirmation candidate and related invalid references are surfaced for correction

### Requirement: Independent state flags
Optional, tentative, and flexible SHALL be independent booleans rather than mutually exclusive display states.

#### Scenario: Multiple flags are selected
- **WHEN** the user enables optional, tentative, and flexible for one entity
- **THEN** all three states remain represented independently in the reviewed candidate

### Requirement: User override precedence
Manual corrections SHALL remain identifiable as user-authored and SHALL take precedence over parser output, raw inference, reparse, and later enrichment/resolution.

#### Scenario: Candidate is revalidated after a correction
- **WHEN** deterministic reconciliation or validation runs after a user correction
- **THEN** it preserves the corrected value and reports conflicts rather than silently restoring the parser value

### Requirement: Review findings update deterministically
Every correction, addition, or deletion SHALL rerun the applicable deterministic candidate checks and SHALL derive blocking/ready state from current candidate data rather than synchronized UI copies.

#### Scenario: Last blocking conflict is corrected
- **WHEN** the user resolves the final blocking validation finding
- **THEN** confirmation becomes eligible based on the newly validated candidate

### Requirement: Authoritative confirmation gate
Confirmation SHALL require a current candidate that passes authoritative validation after all corrections. The system SHALL rerun validation immediately before persistence and SHALL show success only after persistence completes. Faithfully preserved source absence or safely representable ambiguity MUST NOT create a compulsory completion step. Structurally invalid values and genuine unrepresentable conflicts MUST remain blocking and actionable.

#### Scenario: Candidate changes after its last validation
- **WHEN** a stale or invalid candidate reaches the confirmation action
- **THEN** pre-persistence validation blocks activation and returns the user to an actionable Review state

#### Scenario: Persistence succeeds
- **WHEN** authoritative validation and transactional persistence both succeed
- **THEN** the system shows confirmation success and reports the newly active trip rather than the previous trip

#### Scenario: User retains source uncertainty
- **WHEN** the draft faithfully retains unknown dates, absent flight identity or an ambiguous original clock expression without a structural conflict
- **THEN** the user can keep those values and confirm without supplying missing facts or resolving a purely informative finding

### Requirement: Review effort is observable without retaining sensitive content
The acceptance process SHALL record correction count, critical corrections, time to confirmation and reasons for returning to source separately from original parser quality. Review MUST preserve evidence access and mobile/desktop correction parity while allowing inspection without editing every field.

#### Scenario: A captured fixture output needs correction
- **WHEN** a tester corrects a sanitized original draft through Review
- **THEN** the report records the corrections and confirmed result separately and does not change the original parser-quality outcome

### Requirement: Review cancellation and failure are non-destructive
Cancelling Review, closing a presentation surface, validation failure, provider failure, or persistence failure SHALL NOT replace or delete the existing active trip. Surface close MUST NOT imply parse cancellation unless explicitly defined.

#### Scenario: User cancels replacement Review
- **WHEN** an active trip exists and the user explicitly cancels its replacement candidate
- **THEN** the candidate is cleared or safely abandoned and the original trip remains active

#### Scenario: Persistence fails during confirmation
- **WHEN** persistence fails after Review confirmation begins
- **THEN** the original active trip remains unchanged, success is not shown, and the candidate remains recoverable when safe

### Requirement: Responsive and accessible action parity
Review SHALL provide equivalent correction capability at mobile and desktop widths, keyboard-operable primary controls, visible focus, and mobile interaction targets of at least 44px.

#### Scenario: Keyboard-only Review
- **WHEN** a user navigates Review without a pointer
- **THEN** evidence, editable controls, add/delete actions, and confirmation are operable in a logical focus order
