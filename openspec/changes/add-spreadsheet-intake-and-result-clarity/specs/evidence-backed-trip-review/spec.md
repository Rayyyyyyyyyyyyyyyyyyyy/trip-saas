## ADDED Requirements

### Requirement: Spreadsheet evidence renders as a mini-grid
Review SHALL render tabular evidence as a mini-grid that places the cited cells at their relative row/column positions with column letters, row numbers, and the sheet name. Cells between cited cells MAY be elided with a visible gap marker but MUST NOT be invented. The mini-grid SHALL be built from the source-neutral tabular excerpt projection only.

#### Scenario: Calendar-grid event cites three cells
- **WHEN** an entity cites the date header cell, the hour row label, and the content cell
- **THEN** Review shows those cells in their original relative positions, labeled with sheet name and A1 coordinates

#### Scenario: Mini-grid on mobile
- **WHEN** a mini-grid is wider than the mobile reading column
- **THEN** it scrolls horizontally within its own frame without causing page-level horizontal scroll

### Requirement: Unimported images are summarized once
Review SHALL summarize image references that were not imported in one non-blocking line at the top (for example, "2 images in the source were not imported"). The line SHALL expand to list each image reference with its locator, so each reference remains individually inspectable. Unimported images MUST NOT block confirmation or appear as repeated per-item warnings.

#### Scenario: Source references two images
- **WHEN** a Markdown source references `image.png` and `image 1.png` that were not supplied
- **THEN** Review shows one summary line that expands to both references and confirmation is not blocked by them

### Requirement: Coverage wording reflects the selected scope
When a spreadsheet source has user-excluded sheets, Review SHALL describe coverage as complete for the selected sheets and list the excluded sheet names. Review SHALL also show the count of unparsed items. It MUST NOT describe the whole workbook as understood.

#### Scenario: Two sheets were excluded
- **WHEN** the user excluded `金額` and `行李清單`
- **THEN** Review states that coverage is complete for the selected sheets and names both excluded sheets
