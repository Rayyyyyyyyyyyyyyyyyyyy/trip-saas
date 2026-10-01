## MODIFIED Requirements

### Requirement: Source-neutral evidence units
`UnifiedSourceDocument` SHALL express source content through source-neutral evidence-unit identity plus discriminated, schema-constrained structural evidence. Markdown and tabular variants MUST preserve their native structural signals without changing `ParsedTripDraft`, CanonicalTrip entity, or Result contracts. Tabular evidence units SHALL be one per non-empty cell or merged-cell anchor, with stable IDs assigned in sheet order then row-major order, so contiguous ID ranges correspond to contiguous source regions.

#### Scenario: Markdown block becomes evidence
- **WHEN** the Markdown Adapter extracts a heading, paragraph, list item, table, or asset reference
- **THEN** it emits a stable evidence unit whose Markdown structure and original locator remain available without exposing a Markdown AST downstream

#### Scenario: Spreadsheet cell becomes evidence
- **WHEN** the Spreadsheet Source Adapter extracts a non-empty cell or merged region
- **THEN** it emits one stable tabular evidence unit whose sheet, A1 locator, merge range, displayed text, and hyperlink remain available without exposing workbook objects downstream

### Requirement: Complete evidence coverage expectation
Interpretation coverage SHALL be derived from the validated document's evidence-unit IDs. Every evidence unit MUST receive exactly one `interpreted`, `supporting`, or `unparsed` disposition, and every unparsed disposition MUST retain a stable locator, reason, severity, and user-readable message. For spreadsheet sources, the expectation covers only the user-selected visible sheets, and the document SHALL carry the names of user-excluded sheets so that coverage can be reported as complete for the selected scope only.

#### Scenario: Evidence unit is omitted by provider output
- **WHEN** a provider response lacks a disposition for one validated evidence unit
- **THEN** the response fails the coverage gate and cannot enter Review or confirmation

#### Scenario: User excluded a sheet
- **WHEN** the user excluded one sheet before interpretation
- **THEN** that sheet contributes no expected evidence units and is listed as user-excluded rather than counted as covered

## ADDED Requirements

### Requirement: Selected scope is part of source identity
The validated source identity of a spreadsheet document SHALL be derived from the file content together with the normalized selected-sheet set. Two preparations of the same file with different selections MUST have different source identities.

#### Scenario: Same file, different selection
- **WHEN** the same workbook is prepared once with all sheets and once without its expense sheet
- **THEN** the two documents have different source identities and a result for one cannot be applied to the other
