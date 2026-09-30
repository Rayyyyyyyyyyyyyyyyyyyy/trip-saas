## MODIFIED Requirements

### Requirement: Review findings update deterministically
Every correction, addition, or deletion SHALL rerun the applicable deterministic candidate checks and SHALL derive blocking/ready state from current candidate data rather than synchronized UI copies or provider-controlled finding codes. A finding about safely preserved absence or ambiguity SHALL become non-blocking only when its references resolve to the affected source expression, the current candidate retains the required unknown representation and any supplied partial-date or clock expression remains available verbatim through bounded Review evidence/raw fields. Missing references, discarded partial-date evidence, substituted raw text or contradictory exact values MUST remain blocking. An explicit user-authored correction SHALL reconcile or retire the obsolete provider finding after authoritative revalidation; it MUST NOT cause the superseded ambiguity claim to become a permanent blocker.

#### Scenario: Provider finding code claims safe absence
- **WHEN** a provider returns a missing-year or ambiguous-time finding together with an invented exact value, discarded source-supported month/day or substituted clock text
- **THEN** Review remains blocked because the current source-linked candidate does not faithfully preserve the value

#### Scenario: Candidate safely retains partial date or clock ambiguity
- **WHEN** the references resolve, the unsupported full-date/time precision remains null and the supplied partial-date or clock expression remains available verbatim
- **THEN** the explanation is informative and the traveler need not invent a value before confirmation

#### Scenario: Traveler resolves an ambiguity with external knowledge
- **WHEN** the traveler explicitly edits the affected value and the user-authored candidate passes authoritative revalidation
- **THEN** the obsolete provider ambiguity finding is reconciled rather than becoming blocking because the candidate now contains an exact value

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

## ADDED Requirements

### Requirement: Review effort is observable without retaining sensitive content
The acceptance process SHALL record correction count, critical corrections, time to confirmation and reasons for returning to source separately from original parser quality. Review MUST preserve evidence access and mobile/desktop correction parity while allowing inspection without editing every field.

#### Scenario: A captured fixture output needs correction
- **WHEN** a tester corrects a sanitized original draft through Review
- **THEN** the report records the corrections and confirmed result separately and does not change the original parser-quality outcome

### Requirement: Review is exception-led
The default Review surface SHALL present a compact trip summary, conservative system-handling summary and only unresolved findings that require a traveler decision. Complete Day and entity editors SHALL remain available through an explicit disclosure, but the traveler MUST NOT be required to inspect every field before confirmation. Confirmation SHALL remain an explicit action because it replaces the active trip.

#### Scenario: No traveler decision remains
- **WHEN** the candidate passes authoritative validation after any approved conservative handling and has no unresolved blocking decision
- **THEN** Review enables one-step confirmation without expanding the complete editor

#### Scenario: A genuine conflict remains
- **WHEN** source meaning cannot be represented safely without choosing between conflicting interpretations
- **THEN** Review shows the focused conflict with its evidence and keeps confirmation blocked until the candidate changes or an explicit human-knowledge decision resolves it

#### Scenario: Traveler wants detailed inspection
- **WHEN** the traveler opens `查看完整校對內容`
- **THEN** Review exposes the existing source-backed trip, Day and entity correction controls without changing the candidate

### Requirement: Conservative handling is bounded and observable
Before Review, the application MAY apply only an explicitly allowlisted deterministic transformation that removes unsupported semantic precision while retaining source text and references. Each applied transformation SHALL produce a session-only before/after Review adjustment visible in the compact summary, SHALL preserve the original provider result separately for parser-quality assessment, and SHALL pass authoritative validation. It MUST NOT add a fact, choose an alternative, assign a Day, rename a place, delete an entity or persist the Review adjustment log.

#### Scenario: Unsupported clock precision has a safe unknown representation
- **WHEN** a source-support check proves that an exact, approximate or daypart clock was inferred without supported meridiem or daypart
- **THEN** the application downgrades only that time to the valid unknown-time representation, preserves `raw_text` and evidence references, marks the time unresolved and reports the adjustment without requiring traveler action

#### Scenario: No monotonic safe adjustment exists
- **WHEN** resolving a finding would require adding information, choosing meaning or removing itinerary content
- **THEN** the application leaves the candidate unchanged and routes the focused finding to traveler Review

#### Scenario: A detected unsupported value remains in the candidate
- **WHEN** a finding identifies a value that still exists and can be mechanically revalidated
- **THEN** a generic acknowledgement MUST NOT dismiss the finding or enable confirmation without an actual candidate change
