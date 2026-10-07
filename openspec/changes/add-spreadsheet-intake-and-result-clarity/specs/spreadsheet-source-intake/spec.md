## ADDED Requirements

### Requirement: Spreadsheet file entry
Home SHALL accept `.xlsx` and `.csv` files through the same file-entry surface as Markdown and route them to the Spreadsheet Source Adapter. `.xls` SHALL be accepted only after it passes the same extraction acceptance as `.xlsx`; until then it MUST be rejected as unsupported and MUST NOT be listed as supported. A CSV file SHALL become exactly one visible sheet with stable row/column locators. A valid browser-local Gemini credential remains a precondition for interpretation; there is no local-rule fallback.

#### Scenario: User uploads an xlsx workbook
- **WHEN** the user selects a valid `.xlsx` file on Home
- **THEN** the file is read locally by the Spreadsheet Source Adapter and no workbook content leaves the browser before interpretation starts

#### Scenario: User uploads a CSV file
- **WHEN** the user selects a valid `.csv` file
- **THEN** it is extracted as one visible sheet and no sheet-selection step is shown

#### Scenario: xls has not passed acceptance
- **WHEN** `.xls` support has not passed spreadsheet extraction acceptance and the user selects an `.xls` file
- **THEN** intake rejects it as an unsupported type before any provider call and format guidance does not list `.xls`

### Requirement: Visible-sheet selection before interpretation
When a workbook has more than one visible sheet, the application SHALL show a selection step listing every visible sheet in source order, all selected by default, before any provider call. Hidden sheets MUST NOT be listed, extracted, or counted. At least one sheet MUST remain selected to continue. The normalized selection (visible sheet identities in source order) SHALL be part of the prepared source identity. Changing the selection MUST invalidate any prepared source and in-flight request, and retrying an interpretation MUST reuse the same selection.

#### Scenario: User excludes an expense sheet
- **WHEN** the user deselects a sheet named `金額` and continues
- **THEN** that sheet's cells never enter `UnifiedSourceDocument` or the provider request, and the sheet is recorded by name as user-excluded

#### Scenario: Selection changes after preparation
- **WHEN** the user returns to the selection step and changes the selected sheets
- **THEN** the previously prepared source and any in-flight request for it are discarded and a new source identity is prepared

#### Scenario: Workbook contains a hidden sheet
- **WHEN** a workbook contains a hidden sheet
- **THEN** it is absent from the selection list, extraction, and coverage

### Requirement: Faithful cell extraction
The Spreadsheet Source Adapter SHALL extract every usable non-empty cell of each selected sheet into the tabular evidence variant with sheet identity/order, A1 locator, merge range, header context when structurally present, the cell's displayed text, formula cached value, and hyperlink target. Displayed text SHALL be the evidence text. Typed cell values such as date serials or time fractions MAY be supplied only as auxiliary typed hints. The adapter MUST NOT assign itinerary meaning from cell position and MUST NOT execute workbook code.

#### Scenario: Time cell stores a day fraction
- **WHEN** a cell displays `23:00` but stores `0.9583`
- **THEN** the evidence text is `23:00` and the fraction is available only as a typed hint

#### Scenario: Date shows no year but the stored value has one
- **WHEN** a cell displays `8/16` and its stored date carries a year
- **THEN** the evidence text is `8/16`, and any year used only from the typed value is surfaced as a non-blocking missing-year finding rather than a confirmed fact

#### Scenario: Cell carries a hyperlink
- **WHEN** a cell's text links to an HTTPS URL
- **THEN** the exact URL is preserved as that cell's hyperlink evidence

#### Scenario: Formula cached value is missing
- **WHEN** a formula cell has no usable cached display value
- **THEN** an extraction finding is recorded and no formula is evaluated

### Requirement: Irregular layouts are interpreted, not rejected
Layout variety (row-per-event, calendar grid, column-per-day, and mixed reference sheets) SHALL NOT by itself cause rejection. Intake SHALL reject before interpretation only for corrupt or encrypted input, an unsupported extension, an exceeded hard limit (more than 19 visible sheets), or no usable visible cell content. If Gemini cannot establish a supported trip/day structure, the result SHALL be schema-valid `insufficient` with complete coverage and reasons.

#### Scenario: Calendar-grid workbook
- **WHEN** a sheet has hour rows and date columns
- **THEN** extraction succeeds and the interpreter, not the adapter, decides the itinerary structure

#### Scenario: Workbook exceeds the sheet limit
- **WHEN** a workbook has more than 19 visible sheets
- **THEN** intake rejects it with a technical-limit reason before any provider call

### Requirement: Structural chunking for large workbooks
When the selected content exceeds one safe request budget, interpretation SHALL chunk at whole-sheet boundaries. A single over-budget sheet MUST fail with a technical-limit reason before any provider call. Contiguous-region chunking is deferred unless task 6.2 demonstrates it is necessary; any future region implementation MUST retain row/merge and header context. Every chunk result SHALL pass deterministic reference checks and a global reconciliation step before Review; no chunk may confirm or render independently, and coverage MUST NOT report completeness for content that was not interpreted.

#### Scenario: One sheet exceeds the budget
- **WHEN** a single selected sheet exceeds the request budget
- **THEN** intake reports a technical-limit failure before any provider call, retains the selected source, and leaves the confirmed trip readable

### Requirement: Local three-layout spreadsheet acceptance
Spreadsheet intake SHALL NOT be declared accepted until a live acceptance run passes the faithful rubric criteria (zero missing critical events, zero invented critical events, zero unsupported exact critical facts, complete evidence accounting) on three local fixtures: one row-per-event, one calendar-grid, and one column-per-day workbook. Fixtures SHALL be read from the git-ignored local sample directory and MUST NOT be committed.

#### Scenario: One layout fails acceptance
- **WHEN** the calendar-grid fixture has an invented critical event
- **THEN** spreadsheet acceptance remains failed and the failure is recorded rather than averaged away by the other fixtures
