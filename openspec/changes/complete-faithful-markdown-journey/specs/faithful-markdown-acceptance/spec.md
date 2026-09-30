## ADDED Requirements

### Requirement: Versioned scoring recognizes faithful unknowns
Benchmark assessment SHALL version its rubric and classify preserved known facts, preserved unknowns, explained ambiguity, unsupported invention and semantic omission separately. Every original annotation SHALL have an explicit expected representation and a finding requirement only where justified. Historical outputs and scores MUST remain identifiable; a previous completeness-based score MUST NOT be reused as the current fidelity score or silently relabeled as a pass.

#### Scenario: An annotation describes absent airline or clinic identity
- **WHEN** the original draft faithfully preserves the supported event and absent facts without inventing them
- **THEN** scoring can pass that absence condition without an extra warning or user completion, according to the versioned rubric

#### Scenario: An alternative is flattened or a critical fact is invented
- **WHEN** the original output loses a required relationship or introduces an unsupported critical fact
- **THEN** scoring records failure even if coverage and JSON schema pass

### Requirement: Acceptance separates original quality and recovered usefulness
The V0 gate SHALL record original pre-Review quality separately from corrections, confirmed CanonicalTrip and rendered Result. A qualifying original SHALL have zero missing/invented critical events, zero unsupported exact critical facts, complete evidence accounting and all annotated meanings preserved according to the versioned rubric. Source-name fidelity defects MUST be recorded and corrected before claiming this change complete. The exact stable model SHALL remain unaccepted until its schema, deterministic parser and live benchmark gates pass; no alternate model fallback is allowed.

#### Scenario: Review repairs a failed original response
- **WHEN** the user corrects a parser mistake and successfully confirms the fixture
- **THEN** recovery evidence can succeed while original parser failure remains recorded and does not unlock model acceptance or Hosted Delivery

#### Scenario: A candidate qualifies for final acceptance
- **WHEN** exact-model original quality passes and its separately reviewed CanonicalTrip validates, persists, reloads and renders correctly on mobile and desktop
- **THEN** the acceptance report links the original, rubric, corrections and final result before production default activation is implemented and verified

### Requirement: Product usefulness is assessed with source comparison
Acceptance SHALL exercise finding an address/action, reservation state, alternative, optional item, raw ambiguous time and undated information on mobile and desktop. It SHALL record task completion, time-to-find, wrong interpretations and reasons for reopening source, together with Review burden. Visual fidelity and automated browser checks MUST NOT substitute for these observations. No invented numeric usability threshold or commercial acceptance claim is permitted.

#### Scenario: Result contains information but the tester cannot find it
- **WHEN** a tester must reopen the source to locate confirmed travel information
- **THEN** the report records the navigation/content failure and the change does not claim complete usability merely because the entity exists in JSON

### Requirement: Consolidation preserves unresolved work and evidence
Archiving a predecessor with transferred tasks SHALL retain its unchecked statuses, failed gate evidence, successor task mappings and closure reason. The successor SHALL track all inherited open items and the eight review finding categories. Current document entry points SHALL identify the active owner and distinguish approved contract, implementation and verification status.

#### Scenario: Old implementation change is archived before external acceptance
- **WHEN** completed work is consolidated and its remaining acceptance tasks move to this change
- **THEN** the archive states transferred rather than passed, every open task maps to an open successor task and production/model/Hosted gates remain unchanged

### Requirement: Travel readiness has explicit evidence boundaries
V0 completion SHALL retain Golden itinerary/checklist/Tokyo-time compatibility, verify interruption and replacement recovery, and record mobile cold-start/reopen and weak-network observations. Browser-local storage MUST NOT be described as an offline guarantee without an actual offline reopen check. Performance changes SHALL be justified by measurements and preserve frozen visual and ownership contracts.

#### Scenario: Provider fails while a confirmed trip exists
- **WHEN** intake times out, stops or fails during a replacement
- **THEN** the old trip remains readable, inactive results do not activate and the evidence distinguishes static reading from network-dependent features
