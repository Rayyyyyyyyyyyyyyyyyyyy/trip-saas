# Faithful Markdown Acceptance Specification

## Purpose

Define versioned fidelity scoring, separate parser and recovery evidence, source-comparison usability and bounded release gates.

## Requirements

### Requirement: Versioned scoring recognizes faithful unknowns
Benchmark assessment SHALL version its rubric and classify preserved known facts, preserved unknowns, explained ambiguity, unsupported invention and semantic omission separately. Every original annotation SHALL have an explicit expected representation and a finding requirement only where justified. Historical outputs and scores MUST remain identifiable; a previous completeness-based score MUST NOT be reused as the current fidelity score or silently relabeled as a pass.

#### Scenario: An annotation describes absent identity
- **WHEN** the original draft faithfully preserves the supported event and absent facts without inventing them
- **THEN** scoring can pass that absence condition without compulsory completion according to the versioned rubric

#### Scenario: A critical fact is invented
- **WHEN** an original output introduces an unsupported critical fact or loses a required relationship
- **THEN** scoring records failure even if coverage and JSON schema pass

### Requirement: Acceptance separates original quality and recovered usefulness
The V0 gate SHALL record original pre-Review quality separately from corrections, confirmed CanonicalTrip and rendered Result. A qualifying original SHALL have zero missing/invented critical events, zero unsupported exact critical facts, complete evidence accounting and all annotated meanings preserved. The exact stable model SHALL remain unaccepted until schema, deterministic parser and live benchmark gates pass; no alternate model fallback is allowed.

#### Scenario: Review repairs a failed original response
- **WHEN** the user corrects a parser mistake and confirms the fixture
- **THEN** recovery evidence can succeed while original parser failure remains recorded and does not unlock model acceptance or Hosted Delivery

### Requirement: Product usefulness is assessed with source comparison
Acceptance SHALL exercise finding an address/action, reservation state, alternative, optional item, raw ambiguous time and undated information on mobile and desktop. It SHALL record task completion, wrong interpretations and reasons for reopening source together with Review burden. Automated checks MUST NOT substitute for human observations, and no invented numeric usability threshold is permitted.

#### Scenario: Result contains information but the tester cannot find it
- **WHEN** a tester must reopen the source to locate confirmed travel information
- **THEN** the report records the failure and does not claim complete usability merely because the entity exists in JSON

### Requirement: Consolidation preserves unresolved work and evidence
Archiving a predecessor with transferred tasks SHALL retain unchecked statuses, failed gate evidence, successor mappings and closure reason. Current entry points SHALL identify the active owner and distinguish contract, implementation and verification status.

#### Scenario: Old work is archived before external acceptance
- **WHEN** completed work is consolidated and its remaining tasks move to a successor
- **THEN** the archive states transferred rather than passed and production/model/Hosted gates remain unchanged

### Requirement: Travel readiness has explicit evidence boundaries
V0 completion SHALL retain Golden itinerary/checklist/Tokyo-time compatibility, verify interruption and replacement recovery and record mobile cold-start/reopen and weak-network observations. Browser-local storage MUST NOT be described as an offline guarantee without an actual offline reopen check.

#### Scenario: Provider fails while a confirmed trip exists
- **WHEN** intake times out, stops or fails during replacement
- **THEN** the old trip remains readable, inactive results do not activate and evidence distinguishes static reading from network-dependent features
