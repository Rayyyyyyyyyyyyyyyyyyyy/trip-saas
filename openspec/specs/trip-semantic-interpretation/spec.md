# Trip Semantic Interpretation Specification

## Purpose

Define the provider-neutral interpretation contract, the V0 Gemini adapter and credential boundary, schema-valid draft and insufficient outcomes, deterministic validation, and conservative semantic preservation.

## Requirements

### Requirement: Provider-neutral interpretation boundary
The system SHALL interpret every V0 `UnifiedSourceDocument` through one provider-neutral `parseTrip` contract and SHALL keep provider request/response types outside the domain, Review, CanonicalTrip, and Result UI boundaries.

#### Scenario: Gemini response enters the application
- **WHEN** Gemini returns a response
- **THEN** the adapter extracts and validates a provider-neutral `SemanticInterpretationResult` before any downstream code receives it

### Requirement: One Gemini adapter in V0
Generalized Product V0 SHALL provide exactly one Gemini adapter and SHALL NOT provide provider selection, cross-provider fallback, or a speculative provider registry. The exact stable production model SHALL be pinned only after parser fixtures and External Markdown Benchmark #001 pass.

#### Scenario: Gemini request fails
- **WHEN** the Gemini request fails or is rate-limited beyond bounded retry
- **THEN** the system reports a provider failure and does not attempt another provider or local semantic fallback

#### Scenario: Candidate model has not passed acceptance
- **WHEN** the candidate model has not passed the required fixtures
- **THEN** it is not declared or shipped as the pinned production model

### Requirement: Executable versioned response schemas
The implementation SHALL provide executable, versioned, provider-neutral `semantic-interpretation-result.v1.schema.json` and `parsed-trip-draft.v1.schema.json` artifacts. They SHALL require all members, make nullability explicit, reject unknown members, enumerate supported values, and exclude provider metadata.

#### Scenario: Provider omits a required member
- **WHEN** a Gemini response omits a required member even though the source fact is unknown
- **THEN** local schema validation rejects the response rather than inferring the missing member

#### Scenario: Source fact is intentionally absent
- **WHEN** an itinerary entity has no time in the source
- **THEN** the schema-valid draft represents explicit `time.kind = none` and the required nullable fields instead of inventing a time

### Requirement: Discriminated interpretation outcomes
Every `SemanticInterpretationResult` SHALL contain matching schema/source identifiers, `draft | insufficient` status, an appropriately non-null or null draft, structured findings, complete block dispositions, and an explicit unparsed-items list.

#### Scenario: Schema-valid draft result
- **WHEN** interpretation establishes the minimum supported trip/day structure and a linked itinerary entity
- **THEN** the result uses `status = draft` with a schema-valid `ParsedTripDraft`

#### Scenario: Schema-valid insufficient result
- **WHEN** interpretation cannot establish the minimum Reviewable Draft structure without guessing
- **THEN** the result uses `status = insufficient`, sets `draft` to null, and lists missing/unparsed requirements with locators and reasons

### Requirement: Complete source-block accounting
Every source block SHALL receive exactly one disposition of `interpreted`, `supporting`, or `unparsed`. Coverage totals and references MUST be internally consistent, and every unparsed item SHALL contain a stable source reference, reason code, severity, and user-readable message.

The later `harden-source-to-render-boundaries` contract generalizes this rule to
validated source-neutral evidence units while retaining the frozen v1
block-named serialized coverage fields until an explicit schema migration.

#### Scenario: Interpreter cannot classify one block safely
- **WHEN** one source block cannot be attached or classified conservatively
- **THEN** that block is marked `unparsed` and appears in the explicit unparsed-items list rather than disappearing

### Requirement: Conservative semantic preservation
Interpretation SHALL preserve source-supported time precision, cross-midnight/open-ended relations, free time, optional/tentative/flexible states, alternatives, conditions, fallbacks, unresolved places, reservation/ticket/readiness distinctions, source deadlines/buffers, notes, supporting material, and stable provenance without inventing missing exact facts.

#### Scenario: Approximate time is interpreted
- **WHEN** the source says `about 10:30`
- **THEN** the draft records approximate precision and does not convert it into an exact fixed time

#### Scenario: Open-ended time is interpreted
- **WHEN** the source says `18:30~`
- **THEN** the draft records a known start, null end, open-ended kind, and the original raw representation

#### Scenario: Flexible optional content is interpreted
- **WHEN** an item is both flexible and optional
- **THEN** both independent state flags remain true rather than being collapsed into one status

### Requirement: Deterministic response and draft gates
After schema validation, deterministic validators SHALL check source ID/version agreement, coverage, IDs, references, dates, time, trip range, cross-midnight rules, relationships, duplicates, and logical conflicts. Normal Review SHALL remain unavailable until Gate A and the minimum Reviewable Draft gate pass.

#### Scenario: Schema-shaped response has invalid references
- **WHEN** a response passes basic JSON shape but contains an entity referring to an unknown day
- **THEN** deterministic validation blocks progression to Review and reports the reference failure

#### Scenario: Numeric confidence is high but structure is missing
- **WHEN** a response reports high confidence without a supported trip/day structure
- **THEN** the system returns or treats the outcome as insufficient and does not unlock Review

### Requirement: Browser-local Gemini credential boundary
The Gemini key SHALL survive reload on the same browser/device, SHALL NOT be plaintext in `localStorage`, SHALL have an explicit clear action, SHALL NOT sync across devices or enter URLs, logs, CanonicalTrip, Canonical JSON, or hosted publication data, and SHALL NOT be required to read a confirmed trip.

#### Scenario: User reloads with a stored key
- **WHEN** a valid Gemini key was stored and the same browser reloads
- **THEN** Gemini parsing can reuse the browser-local credential without exposing its plaintext in UI or localStorage

#### Scenario: User clears Gemini key
- **WHEN** the user explicitly clears the Gemini credential
- **THEN** the credential is removed while the active confirmed trip remains readable

#### Scenario: Browser cannot satisfy the approved persistence boundary
- **WHEN** a browser cannot persist the credential using the approved non-plaintext storage contract
- **THEN** persistent key saving remains unavailable with a clear explanation and the system does not downgrade to plaintext localStorage

### Requirement: Credential transmission containment
The deployed application SHALL restrict credential-bearing requests to the required Gemini endpoint, SHALL redact credentials and source content from application logs and error instrumentation, and SHALL NOT send credentials to analytics or unrelated network destinations.

#### Scenario: Gemini request fails with diagnostic data
- **WHEN** a credential-bearing Gemini request produces an error
- **THEN** user-visible diagnostics remain actionable while logs and instrumentation contain neither the API key nor raw source content

#### Scenario: Deployment policy is verified
- **WHEN** the production build is prepared for deployment
- **THEN** its network policy permits the required Gemini connection and blocks unapproved credential-bearing destinations

### Requirement: Safe Gemini request behavior
Gemini requests SHALL send credentials through the `x-goog-api-key` header, request structured output, preflight configured size/token limits, support cancellation, handle retryable `429 RESOURCE_EXHAUSTED` and `503 UNAVAILABLE` responses with bounded exponential backoff, and use no unbounded or cross-provider fallback.

#### Scenario: User cancels an active parse
- **WHEN** the current parse is explicitly cancelled
- **THEN** the request is aborted where possible and any later stale response cannot advance workflow state

#### Scenario: Rate limit remains after bounded retries
- **WHEN** Gemini continues returning a retryable rate-limit failure after the configured retry bound
- **THEN** parsing stops with an actionable provider error and preserves any active trip

#### Scenario: Service availability recovers during bounded retry
- **WHEN** Gemini first returns `503 UNAVAILABLE` and a later attempt within the configured retry bound succeeds
- **THEN** parsing continues with that successful response without switching models

#### Scenario: Service remains unavailable after bounded retries
- **WHEN** Gemini continues returning `503 UNAVAILABLE` after the configured retry bound
- **THEN** parsing stops with an actionable provider-unavailable error and preserves any active trip

### Requirement: Source absence and semantic conflict are distinct
Interpretation SHALL preserve absent source facts as declared unknown values and preserve ambiguous supplied expressions with evidence. It MUST NOT infer unsupported dates, meridiem, places or Day bindings, change proper-name characters, or request compulsory completion solely because source information is absent. Useful explanation of safely preserved ambiguity SHALL be non-blocking; genuine unrepresentable conflicts SHALL be exposed for correction. Minimum response/source-coverage and Reviewable Draft gates MUST remain enforced.

#### Scenario: Flight summary lacks identity and row dates
- **WHEN** the source provides flight times but no airline, flight number or supported Day association
- **THEN** interpretation retains the flight and known times, leaves unsupported facts unknown and does not assign first/last Day merely from outbound/return labels

#### Scenario: Source supplies an ambiguous clock or a proper name
- **WHEN** a source contains a clock without supported meridiem or a place name in its original script
- **THEN** the draft retains the original clock expression without unsupported exact time/daypart and preserves the proper-name characters rather than translating or substituting them

#### Scenario: Source meaning is genuinely conflicting
- **WHEN** mutually conflicting source evidence cannot be represented faithfully by the supported draft model
- **THEN** the conflict is explicitly surfaced or rejected through the bounded recovery path rather than silently selected or repaired

### Requirement: Fidelity checks do not masquerade as semantic proof
The single maintained prompt and field-schema guidance SHALL be tested as the actual provider request. Regression checks SHALL distinguish format constraints, source-support checks and human semantic assessment; generated confidence, valid JSON and complete coverage MUST NOT be reported as proof of faithful meaning. Production instructions MUST NOT include benchmark answers or hidden automatic repair assumptions.

#### Scenario: Locally valid response changes a source name
- **WHEN** a schema-valid response contains altered proper-name characters or unsupported inferred precision
- **THEN** acceptance records a fidelity defect and retains the original evidence instead of declaring success based on schema or confidence alone

### Requirement: Provider schema directly constrains draft shape
The Gemini structured-output schema SHALL constrain the direct `draft` property to either a complete provider projection of `ParsedTripDraft` or `null`. It MUST NOT leave the direct `draft` property unconstrained and depend only on an outer conditional union to supply its structure.

#### Scenario: Summary-shaped draft is not accepted
- **WHEN** a provider response contains a summary-shaped draft instead of the complete projected `ParsedTripDraft`
- **THEN** deterministic validation rejects the response before Review

### Requirement: Provider projection is regression-tested
The generated Gemini schema and response adapter SHALL have deterministic regression coverage for valid draft, valid insufficient and malformed summary-shaped responses. Projection checks MUST fail if the direct `draft` constraint becomes empty or no longer references the complete draft structure.

#### Scenario: Generated schema regresses to empty draft
- **WHEN** a code change leaves the projected `properties.draft` empty or unconstrained
- **THEN** the provider-projection regression test fails before a live request is made

### Requirement: Projected fields retain constraint guidance
The authoritative interpretation schemas SHALL describe field formats and unknown-value handling, and provider projection SHALL preserve those descriptions. Omitted validation constraints SHALL be covered by deliberate guidance or a documented local-only enforcement decision. Descriptions MUST NOT replace deterministic local enforcement.

#### Scenario: Clock and URL restrictions cannot be enforced by the provider subset
- **WHEN** projection omits local clock or URL patterns
- **THEN** field guidance states HH:mm without seconds and source-supported HTTPS-or-null while local validation remains authoritative

### Requirement: The interpreter document is the executable prompt source
The application SHALL load `spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md` as build-time text and append the validated source JSON. It MUST NOT maintain a parallel handwritten prose prompt. Source content MUST remain evidence rather than instructions.

#### Scenario: The interpreter document changes
- **WHEN** the application is rebuilt after an interpreter-document edit
- **THEN** the actual Gemini request contains that complete document and validated source JSON as verified against an independent file read
