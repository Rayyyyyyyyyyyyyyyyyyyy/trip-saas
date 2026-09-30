## MODIFIED Requirements

### Requirement: One Gemini adapter in V0
Generalized Product V0 SHALL provide exactly one Gemini adapter and SHALL NOT provide provider selection, alternate-model execution, cross-provider fallback or a speculative provider registry. Every bounded retry for one interpretation SHALL use the same configured exact model. The exact stable production model SHALL be pinned only after generated-provider-schema checks, deterministic parser fixtures and a key-backed live External Markdown Benchmark #001 pass, followed by the required integrated acceptance and explicit activation.

#### Scenario: Gemini request fails
- **WHEN** the Gemini request fails or is rate-limited beyond bounded same-model retry
- **THEN** the system reports a provider failure and does not attempt another model, provider or local semantic fallback

#### Scenario: Alternate-model configuration is present
- **WHEN** V0 starts with configuration for a second Gemini model
- **THEN** that configuration does not construct another parser or expose an alternate interpretation/retry path

#### Scenario: Candidate model has not passed every gate
- **WHEN** generated-schema, deterministic, key-backed live or integrated acceptance evidence is incomplete
- **THEN** the candidate is not declared or shipped as the pinned production model

## ADDED Requirements

### Requirement: Source absence and semantic conflict are distinct
Interpretation SHALL preserve absent source facts as declared unknown values and preserve ambiguous supplied expressions with evidence. It MUST NOT infer unsupported dates, meridiem, places or Day bindings, change proper-name characters, or request compulsory completion solely because source information is absent. Useful explanation of safely preserved ambiguity SHALL be non-blocking only when deterministic inspection resolves its source references, retains any supplied partial-date evidence or verbatim raw clock expression and proves unsupported exact precision remains absent. A provider finding code alone MUST NOT establish that state. Genuine unrepresentable conflicts SHALL be exposed for correction. Minimum response/source-coverage and Reviewable Draft gates MUST remain enforced.

#### Scenario: Flight summary lacks identity and row dates
- **WHEN** the source provides flight times but no airline, flight number or supported Day association
- **THEN** interpretation retains the flight and known times, leaves unsupported facts unknown and does not assign first/last Day merely from outbound/return labels

#### Scenario: Source supplies an ambiguous clock or a proper name
- **WHEN** a source contains a clock without supported meridiem or a place name in its original script
- **THEN** the draft retains the original clock expression without unsupported exact time/daypart and preserves the proper-name characters rather than translating or substituting them

#### Scenario: Source supplies a month and day without a year
- **WHEN** a source contains a partial date but no supported year
- **THEN** the draft leaves unsupported full-date precision null while its source-linked Review representation retains the supplied month/day expression

#### Scenario: Arabic 12-hour marker lacks daypart
- **WHEN** the source contains `12點` without noon, midnight, AM, PM or another supported daypart
- **THEN** local fidelity checking treats inferred exact/daypart precision as a Review defect and retains `12點` verbatim

#### Scenario: Legal 24-hour clock has no contrary context
- **WHEN** the source supplies `12:30` in a context that supports ordinary 24-hour `HH:mm`
- **THEN** the detector does not classify that value as ambiguous solely because its hour is 12

#### Scenario: Source meaning is genuinely conflicting
- **WHEN** mutually conflicting source evidence cannot be represented faithfully by the supported draft model
- **THEN** the conflict is explicitly surfaced or rejected through the bounded recovery path rather than silently selected or repaired

### Requirement: Fidelity checks do not masquerade as semantic proof
The single maintained prompt and field-schema guidance SHALL be tested as the actual provider request. Regression checks SHALL distinguish format constraints, source-support checks and human semantic assessment; generated confidence, valid JSON and complete coverage MUST NOT be reported as proof of faithful meaning. Production instructions MUST NOT include benchmark answers or hidden automatic repair assumptions.

#### Scenario: Locally valid response changes a source name
- **WHEN** a schema-valid response contains altered proper-name characters or unsupported inferred precision
- **THEN** acceptance records a fidelity defect and retains the original evidence instead of declaring success based on schema or confidence alone

### Requirement: Parser quality and conservative recovery remain distinct
The application SHALL preserve the provider result as the original interpretation outcome for acceptance scoring. A deterministic recovery step MAY produce a separate Review candidate only when an allowlisted transformation monotonically removes unsupported precision and retains the source expression and references. Recovery MUST NOT be reported as parser success and MUST NOT silently alter benchmark artifacts.

#### Scenario: Review candidate safely removes an unsupported inference
- **WHEN** an allowlisted source-support check produces a conservative adjustment before Review
- **THEN** the original result remains the parser-quality artifact and the adjusted candidate is identified separately as Review recovery
