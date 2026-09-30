# Trip Interpretation Workflow Specification

## Purpose

Define the single candidate lifecycle, provider-neutral interpretation boundary, bounded processing recovery, model acceptance gate, and explicit sample routing for Markdown V0.

## Requirements

### Requirement: Single candidate workflow owner
One application workflow owner SHALL hold the active trip, candidate source/document, request identity, processing stage, interpretation result, Review draft/findings, confirmation state, failure, and cancellation state. Intake controls MAY retain unsubmitted file/paste form values but MUST NOT keep synchronized interpretation, validation, candidate, or failure state.

#### Scenario: Interpretation progress changes
- **WHEN** a candidate advances from extraction through interpretation and validation
- **THEN** every progress surface derives its state from the application workflow rather than a callback-synchronized feature reducer

#### Scenario: Input text changes before processing
- **WHEN** the user edits pasted Markdown before starting a candidate
- **THEN** the intake control may update local form state without creating or mutating the application candidate

### Requirement: Deep interpretation interface
The application SHALL invoke semantic interpretation through one provider-neutral interface that accepts a validated `UnifiedSourceDocument`, credential, and cancellation signal and returns a bounded Review candidate, insufficient result, or failure. The module SHALL own input assertion, request preflight, provider invocation, local response-schema validation, source coverage Gate A, and Reviewable Draft Gate B in one defined order.

#### Scenario: Valid provider draft
- **WHEN** Gemini returns a schema-valid, fully covered, Reviewable Draft for the current source
- **THEN** the interpretation module returns one Review candidate and the App performs no duplicate gate evaluation

#### Scenario: Schema-valid insufficient result
- **WHEN** Gemini accounts for all evidence but cannot support the minimum trip/day structure
- **THEN** the interpretation module returns the insufficient result for bounded recovery and does not fabricate or expose a normal Review draft

### Requirement: Provider adapter isolation
The Gemini adapter SHALL own only provider transport concerns, including endpoint/model selection, `x-goog-api-key` authentication, provider request/response envelopes, HTTP error translation, timeout, cancellation, and bounded `429`/`503` retry. Provider-specific types, metadata, model identity, and raw envelopes MUST NOT cross the interpretation interface or enter trip data.

#### Scenario: Provider returns malformed envelope
- **WHEN** Gemini returns an unreadable or missing structured response payload
- **THEN** the adapter reports a bounded provider-response failure without exposing the raw envelope to App, Review, CanonicalTrip, or diagnostics

### Requirement: Benchmark-gated exact default model
The selected V0 default candidate SHALL be the exact stable model ID `gemini-3.8-flash`. The production composition root MUST NOT activate that default until its generated structured-output projection, deterministic parser fixtures, and live External Markdown Benchmark #001 pass. The App MUST NOT use a moving alias or silently fall back to another model, and model identity MUST NOT enter trip data or Result presentation.

#### Scenario: Model acceptance gate passes
- **WHEN** `gemini-3.8-flash` passes the required deterministic and live parser-quality gates
- **THEN** a production build with no explicit test override uses exact `gemini-3.8-flash` for Markdown interpretation

#### Scenario: Model acceptance is absent or fails
- **WHEN** the required `gemini-3.8-flash` acceptance evidence is missing or failing
- **THEN** production does not silently activate it or substitute another model and exposes bounded interpreter-unavailable recovery

#### Scenario: A later default-model change is proposed
- **WHEN** a different model is proposed as the default
- **THEN** that exact model must rerun the same schema, parser-quality, and live benchmark gates before activation

### Requirement: Bounded blocking-modal lifetime
The application workflow SHALL enforce configured stage/overall processing deadlines independently of the Gemini adapter's per-attempt request deadline. Every success, insufficient result, failure, deadline expiry, or explicit stop MUST transition the current candidate out of the blocking modal, clear active timers, and preserve the current confirmed trip. Deadline expiry MUST abort active work and expose bounded preserved-source recovery.

#### Scenario: A non-provider stage never settles
- **WHEN** source reading, extraction, source validation, or local output validation exceeds its configured workflow deadline
- **THEN** the workflow aborts the candidate, closes the blocking modal, preserves the selected source and active trip, and exposes a retryable phase-safe failure

#### Scenario: Provider deadline ends the request
- **WHEN** the Gemini adapter reports a provider timeout before the application deadline
- **THEN** the workflow enters the same terminal failure contract and does not leave the modal open

#### Scenario: Malformed structured output is rejected
- **WHEN** Gemini returns structured content that cannot pass local JSON, response-schema, coverage, or Reviewable Draft validation
- **THEN** the workflow closes the blocking modal into preserved-source failure recovery, keeps the current confirmed trip unchanged, and does not enter Review or Result

### Requirement: Explicit processing stop action
The active blocking modal SHALL expose an explicit `停止這次判讀` action wired to current-session cancellation. Escape and backdrop dismissal MAY remain disabled to prevent accidental hidden work, but the user MUST have an intentional way to abort. Stopping MUST preserve the selected file/paste value and current confirmed trip, and late results MUST be ignored.

#### Scenario: User stops a pending interpretation
- **WHEN** the user activates `停止這次判讀`
- **THEN** the active session/request is aborted, the modal closes, the selected source remains available for retry/edit, and the confirmed trip is unchanged

### Requirement: Current-request and cancellation integrity
Every candidate and provider request SHALL have stable session/request identity. Starting a newer candidate or explicitly cancelling the current candidate MUST abort its active request, and any late result from an inactive identity MUST be ignored without changing candidate, Review, or active-trip state.

#### Scenario: Older request resolves after replacement starts
- **WHEN** request A completes after the user has started candidate request B
- **THEN** request A produces no workflow transition and request B remains the only candidate

#### Scenario: User cancels interpretation
- **WHEN** the user explicitly cancels the active candidate
- **THEN** active work is aborted, candidate session data is cleared, the intake control retains the selected source where technically possible, and the previously confirmed trip remains readable

### Requirement: Failure recovery preserves source and active truth
A recoverable read, extraction, preflight, provider, response-validation, or pre-Review failure SHALL preserve the selected source for retry/edit where technically possible and MUST preserve the current confirmed trip. Only a successfully validated and persisted confirmation may replace the active trip.

#### Scenario: Pre-Review validation fails
- **WHEN** provider output is schema-valid but fails the required Reviewable Draft gate
- **THEN** the workflow exposes the bounded pre-Review failure, keeps the selected source available, and does not enter Review or persistence

#### Scenario: Provider output passes all interpretation gates
- **WHEN** provider output becomes a valid Review candidate
- **THEN** the workflow enters Review and does not replace the active trip or render the candidate until authoritative confirmation and persistence commit succeed

### Requirement: Explicit Golden sample routing
Golden sample capability SHALL be selected through explicit sample state and MUST NOT be inferred from CanonicalTrip ID. Any persisted confirmed trip SHALL render the supplied CanonicalTrip even when its ID equals the bundled fixture ID.

#### Scenario: User explicitly opens sample
- **WHEN** the user activates the bundled Osaka sample action
- **THEN** the App opens Golden sample capabilities without persisting or replacing the current trip

#### Scenario: Confirmed trip uses Golden fixture ID
- **WHEN** a valid persisted or imported CanonicalTrip has the same ID as the bundled Golden fixture
- **THEN** the confirmed-trip path renders that supplied CanonicalTrip rather than substituting bundled data
