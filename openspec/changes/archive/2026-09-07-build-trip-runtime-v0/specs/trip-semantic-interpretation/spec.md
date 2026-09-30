## ADDED Requirements

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
Gemini requests SHALL send credentials through the `x-goog-api-key` header, request structured output, preflight configured size/token limits, support cancellation, handle retryable rate limits with bounded backoff, and use no unbounded or cross-provider fallback.

#### Scenario: User cancels an active parse
- **WHEN** the current parse is explicitly cancelled
- **THEN** the request is aborted where possible and any later stale response cannot advance workflow state

#### Scenario: Rate limit remains after bounded retries
- **WHEN** Gemini continues returning a retryable rate-limit failure after the configured retry bound
- **THEN** parsing stops with an actionable provider error and preserves any active trip
