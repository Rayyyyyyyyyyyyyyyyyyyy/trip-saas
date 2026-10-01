## MODIFIED Requirements

### Requirement: Home-first Markdown entry
When no valid confirmed CanonicalTrip is active, the application SHALL open Home and SHALL provide operable Markdown file upload, pasted Markdown input, and spreadsheet file upload paths. Home SHALL also keep Gemini credential controls, Canonical JSON import, privacy/format guidance, and the explicit Golden sample path reachable through visible controls. Home SHALL reserve a non-blocking composition area for later optional fields without inventing or requiring traveler profile data in V0.

#### Scenario: Clean start opens Home
- **WHEN** the application starts without a valid persisted active trip
- **THEN** Home is shown and the bundled Osaka fixture is not silently activated

#### Scenario: Secondary controls remain reachable
- **WHEN** credential, Canonical import, privacy, or sample controls are placed outside the first viewport
- **THEN** each capability is reachable through an explicit visible interactive control

#### Scenario: Reserved optional area does not block intake
- **WHEN** Home renders before any later optional fields have been approved
- **THEN** the reserved area introduces no required traveler input and Markdown and spreadsheet intake remain immediately operable

#### Scenario: File entry accepts a spreadsheet
- **WHEN** the user chooses a `.xlsx` or `.csv` file from the Home file entry
- **THEN** the file is routed to spreadsheet intake instead of being rejected as unsupported

### Requirement: Accurate format scope
Format guidance SHALL identify Markdown file, pasted Markdown, `.xlsx`, and `.csv` as enabled; `.xls` only after it passes spreadsheet acceptance; and PDF, images/screenshots, and DOCX as unsupported. It MUST NOT imply that a format is enabled merely because it appears in roadmap copy, and it SHALL state that embedded spreadsheet images and Markdown attachments are not imported.

#### Scenario: User inspects format guidance
- **WHEN** the user opens supported-format information
- **THEN** Markdown, `.xlsx`, and `.csv` are enabled, PDF and images are explicitly unsupported, and `.xls` appears only if it has passed acceptance

#### Scenario: Guidance explains image limits
- **WHEN** the user reads spreadsheet or Markdown format guidance
- **THEN** it states that images embedded in the source are not imported in this version
