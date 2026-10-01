## MODIFIED Requirements

### Requirement: Complete source-block accounting
Every source evidence unit SHALL receive exactly one disposition of `interpreted`, `supporting`, or `unparsed`. Coverage totals and references MUST be internally consistent, and every unparsed item SHALL contain a stable source reference, reason code, severity, and user-readable message.

A versioned response schema SHALL allow the provider to report a disposition for an inclusive contiguous range of evidence-unit IDs in document order. Before any draft gate, the browser SHALL expand every range and verify that each expected evidence unit is covered exactly once, with no gaps, overlaps, unknown IDs, or reversed/out-of-document ranges. A range MUST NOT carry `unparsed`, because each unparsed item needs its own reason. Individual (non-range) dispositions remain valid. Changing to this schema version requires rerunning External Markdown Benchmark #001.

#### Scenario: Interpreter cannot classify one block safely
- **WHEN** one source evidence unit cannot be attached or classified conservatively
- **THEN** that unit is marked `unparsed` and appears in the explicit unparsed-items list rather than disappearing

#### Scenario: Whole reference sheet is supporting
- **WHEN** the provider reports one range covering every cell of a food-list sheet as `supporting`
- **THEN** local expansion accounts for each cell exactly once and the response passes coverage without per-cell output

#### Scenario: Ranges overlap
- **WHEN** two reported ranges both include the same evidence unit
- **THEN** the response fails the coverage gate and cannot enter Review

#### Scenario: Range skips a unit
- **WHEN** the expanded ranges and individual dispositions leave one expected unit without a disposition
- **THEN** the response fails the coverage gate
