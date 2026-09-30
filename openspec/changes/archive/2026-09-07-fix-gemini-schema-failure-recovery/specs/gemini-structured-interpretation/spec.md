## ADDED Requirements

### Requirement: Provider schema directly constrains draft shape
The Gemini structured-output schema SHALL constrain the direct `draft` property to either a complete provider projection of `ParsedTripDraft` or `null`. It MUST NOT leave the direct `draft` property unconstrained and depend only on an outer conditional union to supply its structure.

#### Scenario: Draft response uses the complete contract
- **WHEN** Gemini returns `status=draft`
- **THEN** the provider schema requires `draft` to contain the complete projected `ParsedTripDraft` structure, including trip, structured days, entities, relationships, supporting items, and findings

#### Scenario: Insufficient response uses null draft
- **WHEN** Gemini cannot support the minimum trip structure and returns `status=insufficient`
- **THEN** the provider schema permits `draft=null` and the strict local schema verifies that the status and draft value agree

#### Scenario: Summary-shaped draft is not accepted
- **WHEN** a provider response contains a summary-shaped draft with fields such as top-level title, date range, string flights, or string days instead of `ParsedTripDraft`
- **THEN** deterministic validation rejects the response before Review

### Requirement: Local validation remains authoritative
Every Gemini interpretation response MUST pass strict local response schema validation, source identity and complete block coverage validation, and Reviewable Draft validation before it can enter Review. Provider-side structured generation MUST NOT replace or bypass these gates.

#### Scenario: Provider returns syntactically valid but locally invalid JSON
- **WHEN** Gemini returns valid JSON that violates the strict local interpretation schema
- **THEN** the adapter returns a recoverable response-validation failure and does not expose a draft to Review

#### Scenario: Response schema passes but coverage fails
- **WHEN** a structured draft omits, duplicates, or invents source block dispositions
- **THEN** the adapter rejects it at the coverage gate and does not expose a draft to Review

#### Scenario: Reviewable Draft gate fails
- **WHEN** a schema-valid and coverage-complete draft violates pre-Review semantic or relationship requirements
- **THEN** the adapter rejects it before Review and preserves the current confirmed trip

### Requirement: Provider projection is regression-tested
The generated Gemini schema and response adapter SHALL have deterministic regression coverage for valid draft, valid insufficient, and malformed summary-shaped responses. The projection checks MUST fail if the direct `draft` constraint becomes empty or no longer references the complete draft structure.

#### Scenario: Generated schema regresses to empty draft
- **WHEN** a code change causes the projected `properties.draft` schema to become empty or unconstrained
- **THEN** the provider-projection regression test fails before a live request is made

#### Scenario: Captured malformed shape is replayed
- **WHEN** the known malformed summary-shaped response is replayed through the real Gemini adapter boundary
- **THEN** the replay deterministically produces a response-validation failure and never reaches Review

### Requirement: Provider diagnostics remain contained
Gemini credentials, raw provider envelopes, thought signatures, model metadata, detailed schema paths, and source contents MUST NOT be persisted or shown in the user-facing failure notice. Test fixtures derived from captured responses MUST contain only the minimum sanitized shape required to reproduce the contract failure.

#### Scenario: Response validation fails
- **WHEN** a provider response is rejected by local validation
- **THEN** diagnostics may retain only the existing bounded safe code and phase while sensitive provider and source material remains absent from durable storage and UI copy


### Requirement: Projected fields retain constraint guidance
The authoritative interpretation schemas SHALL describe field formats and unknown-value handling, and provider projection SHALL preserve those descriptions. Omitted validation constraints SHALL be inventoried and covered by deliberate guidance or a documented local-only enforcement decision. The implementation MUST retain authoritative local constraints, required members, accepted values, and schema versions; descriptions MUST NOT be treated as equivalent to deterministic enforcement.

#### Scenario: Clock and URL restrictions cannot be enforced by the provider subset
- **WHEN** the projection omits local pattern restrictions for clock or URL fields
- **THEN** the generated field guidance states HH:mm without seconds and source-supported HTTPS-or-null for nullable URLs, while local validation still rejects seconds and relative URLs

#### Scenario: A new constraint is omitted without a decision
- **WHEN** a schema edit introduces a constraint removed by projection without accounted guidance or an explicit local-only decision
- **THEN** deterministic projection regression checks fail

#### Scenario: An action has no supported valid URL
- **WHEN** the source supplies no valid HTTPS URL for a prospective action
- **THEN** interpretation omits the action instead of inventing a URL or inserting null into its required non-nullable URL field

### Requirement: Interpretation represents uncertainty without invented precision
The application-owned provider-neutral instructions SHALL define how the existing draft fields preserve ambiguous times, partial dates, and unavailable assets. The interpreter MUST retain source evidence and raw expressions, emit focused source/entity-linked findings for unresolved decisions, and MUST NOT invent exact values to satisfy a field format. Benchmark expected answers MUST NOT be embedded in production instructions.

#### Scenario: Clock meridiem is unsupported
- **WHEN** a source clock expression does not support a unique 24-hour time
- **THEN** the draft retains its raw expression and source evidence, leaves exact clock fields null using a valid existing time representation, and surfaces the ambiguity for Review instead of selecting an exact morning or evening time

#### Scenario: The source provides month and day without a year
- **WHEN** no source-supported year is available
- **THEN** full dates remain null, partial date evidence is retained, and Review receives the missing-year finding rather than an invented current year

#### Scenario: A relative image is unavailable
- **WHEN** a Markdown source references an image that was not uploaded and has only a relative path
- **THEN** the draft preserves an unresolved asset supporting item and its reference text/evidence with null URL, and that missing asset alone does not prevent a structurally reviewable draft

#### Scenario: A response remains malformed after improved instructions
- **WHEN** the provider returns seconds in HH:mm fields or a relative path in an HTTPS-only field
- **THEN** existing local validation rejects the response before Review without client-side coercion or an automatic model repair request

### Requirement: Live comparison preserves truthful per-level evidence
The benchmark runner SHALL retain bounded outcomes for each configured thinking level, distinguish safe parser failure codes and phases, and preserve completed outcomes when a later level fails. Level-specific interpretation failures SHALL permit remaining comparisons; credential/setup failures or explicit abort SHALL terminate with remaining levels marked not run. Execution failure MUST NOT be reported as semantic acceptance, and no incomplete comparison may be reported as passing.

#### Scenario: Low thinking fails local response validation
- **WHEN** the low-thinking response fails the local schema while credentials and setup remain usable
- **THEN** its outcome records a response-validation failure, the remaining levels are compared, and the aggregate execution check reports the attempted failure after writing the bounded artifact

#### Scenario: Credential or setup failure ends comparison
- **WHEN** comparison encounters a credential/setup failure or explicit abort
- **THEN** completed outcomes remain available, remaining levels are marked not run, and the incomplete comparison does not pass

#### Scenario: Schema-valid output invents exact clock precision
- **WHEN** an original pre-Review output silently assigns an exact time forbidden by a fixture annotation
- **THEN** semantic acceptance fails even if response schema and source coverage pass, and later Review corrections cannot change that original parser-quality result

#### Scenario: Responses execute successfully before human assessment
- **WHEN** all configured responses are collected but annotated semantic checks and corrected Canonical validation/rendering have not been completed
- **THEN** execution may be reported successful, human acceptance remains pending, and the exact model remains unaccepted as a production default

#### Scenario: Comparison artifacts are retained
- **WHEN** benchmark results are written locally
- **THEN** they contain only bounded safe outcomes and permitted sanitized fixture evidence, excluding credentials, thought signatures, full provider envelopes, and production ReviewSession data


### Requirement: The interpreter document is the executable prompt source
The application SHALL load `spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md` as build-time
text and append the validated source JSON to it. It MUST NOT maintain a parallel
handwritten prose prompt. Schema field descriptions remain authoritative format
guidance. Source content MUST remain evidence rather than instructions.

#### Scenario: The interpreter document changes
- **WHEN** the application is rebuilt after an interpreter-document edit
- **THEN** the actual Gemini request contains that complete document and the validated source JSON, as verified against an independent read of the file

#### Scenario: The source omits a fact
- **WHEN** the source contains no airline, flight number, year, accommodation identity or other fact
- **THEN** the instructions preserve the declared unknown representation without inventing a value or requiring a blocking completeness finding

#### Scenario: Original source wording has no supported normalization
- **WHEN** a name or clock expression cannot be safely normalized from source evidence
- **THEN** the instructions retain the original wording verbatim and do not substitute a guessed exact time, translated name, or unsupported Day assignment
