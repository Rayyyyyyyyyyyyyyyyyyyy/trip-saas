## ADDED Requirements

### Requirement: Home-first Markdown entry
When no valid confirmed CanonicalTrip is active, the application SHALL open Home and SHALL provide operable Markdown file upload and pasted Markdown input paths. Home SHALL also keep Gemini credential controls, Canonical JSON import, privacy/format guidance, and the explicit Golden sample path reachable through visible controls. Home SHALL reserve a non-blocking composition area for later optional fields without inventing or requiring traveler profile data in V0.

#### Scenario: Clean start opens Home
- **WHEN** the application starts without a valid persisted active trip
- **THEN** Home is shown and the bundled Osaka fixture is not silently activated

#### Scenario: Secondary controls remain reachable
- **WHEN** credential, Canonical import, privacy, or sample controls are placed outside the first viewport
- **THEN** each capability is reachable through an explicit visible interactive control

#### Scenario: Reserved optional area does not block intake
- **WHEN** Home renders before any later optional fields have been approved
- **THEN** the reserved area introduces no required traveler input and Markdown intake remains immediately operable

### Requirement: One normalized Markdown input contract
File upload and pasted Markdown SHALL normalize into the same versioned `TextSourceInput` contract with a non-empty `content`, stable session `source_id`, `input_mode`, `text/markdown` media type, and required `display_name`.

#### Scenario: Markdown file normalization
- **WHEN** the user selects one readable supported Markdown file
- **THEN** the system creates a schema-valid `TextSourceInput` with `input_mode = markdown_file`

#### Scenario: Pasted Markdown normalization
- **WHEN** the user submits non-empty pasted Markdown
- **THEN** the system creates the same schema-valid input shape with `input_mode = pasted_markdown`, a generated display name, and a stable session source ID

### Requirement: Operable pasted-text input
The pasted Markdown path SHALL provide an actual text input, explicit start action, current character count, clear/replace action, disabled start behavior while empty, and a user-readable empty-input error.

#### Scenario: Empty paste cannot start
- **WHEN** the pasted input contains only whitespace
- **THEN** parsing cannot begin and the input displays a clear validation error

#### Scenario: Clear pasted input
- **WHEN** the user activates the clear action after entering text
- **THEN** the text and its validation state return to the empty-input state

### Requirement: Early source validation
The intake boundary SHALL reject unsupported types, empty/unreadable content, corrupt input, and configured size-limit violations before semantic interpretation begins.

#### Scenario: Unsupported file type
- **WHEN** the user supplies a PDF, spreadsheet, or another unsupported V0 file type
- **THEN** the system identifies the format as unsupported, does not call Gemini, and offers a replace-source path

#### Scenario: Source exceeds configured limit
- **WHEN** normalized Markdown exceeds a configured technical limit
- **THEN** the system stops before interpretation and explains the applicable limit without modifying the active trip

### Requirement: Structure-preserving Markdown extraction
The Markdown Source Adapter SHALL preserve block order, hierarchy, raw text, links, structural hints, and deterministic line/block locators in `UnifiedSourceDocument`. It MUST treat Markdown structure as evidence rather than semantic truth.

#### Scenario: Mixed Markdown semantics remain available
- **WHEN** Markdown contains headings, lists, tables, links, and sequence-like text such as `A > B > C`
- **THEN** the adapter preserves their order, content, structure, and locators without deciding itinerary meaning

#### Scenario: Missing relative asset
- **WHEN** Markdown references a missing relative image asset
- **THEN** extraction records the broken reference as evidence/finding data and continues processing the remaining document

### Requirement: Stable source evidence
Every extracted source block SHALL have a stable reference and locator usable by interpretation, coverage accounting, findings, and Review. Pasted input SHALL receive deterministic locators equivalent in purpose to file-input locators.

#### Scenario: Review traces a pasted block
- **WHEN** a finding originates from pasted Markdown
- **THEN** the finding resolves to a stable excerpt and locator from the same session source

### Requirement: Truthful progress and privacy guidance
The UI SHALL communicate grouped intake progress for reading, source-document construction, semantic interpretation, and validation/Review preparation without claiming completion early. Before transmission it SHALL state that semantic interpretation uses Gemini, source content is sent to Gemini, local/session and durable storage differ, and Gemini credentials do not enter CanonicalTrip.

#### Scenario: Interpretation disclosure before sending
- **WHEN** the user is about to start a Gemini-backed parse
- **THEN** the interface has already disclosed that the source content will be sent to Gemini

#### Scenario: Progress does not predeclare success
- **WHEN** extraction has completed but interpretation is still pending
- **THEN** progress marks extraction complete and interpretation current without showing Review or confirmation success

### Requirement: Intake failure preserves confirmed data
Validation, extraction, cancellation, or provider failure SHALL leave any active confirmed trip readable and unchanged and SHALL offer retry, replace, or return-to-trip recovery appropriate to the failure.

#### Scenario: Replacement extraction fails
- **WHEN** an active trip exists and replacement Markdown extraction fails
- **THEN** the candidate enters a recoverable failure state while the original active trip remains available

### Requirement: Accurate format scope
V0 format guidance SHALL identify Markdown file and pasted Markdown as enabled, spreadsheets as a gated later capability, and PDF input as unsupported. It MUST NOT imply that a format is enabled merely because it appears in roadmap copy.

#### Scenario: User inspects format guidance
- **WHEN** the user opens supported-format information in V0
- **THEN** Markdown is enabled, spreadsheet import is not presented as operable, and PDF is explicitly unsupported
