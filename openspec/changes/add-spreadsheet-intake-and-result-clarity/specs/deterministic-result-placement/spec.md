## ADDED Requirements

### Requirement: Supporting items are projected into ordered groups
Presentation Projection SHALL place every supporting item exactly once: either in its confirmed group, ordered by group order then item order, or in the ungrouped reference region when its group is null. Each projected group SHALL expose its label and retained item count. Projection verification SHALL fail if any supporting item is missing or duplicated. Unresolved image supporting items SHALL be projected as non-rendering references, so Result receives no placeholder for them.

#### Scenario: Mixed grouped and ungrouped supporting items
- **WHEN** a trip has three items in group `美食清單`, two in group `行李清單`, and one with a null group
- **THEN** the projection yields two ordered groups with counts 3 and 2 plus one ungrouped reference, and verification accounts for all six items

#### Scenario: Supporting item is unresolved image
- **WHEN** a supporting item is an unresolved image reference
- **THEN** it is accounted for in verification but produces no rendered placeholder
