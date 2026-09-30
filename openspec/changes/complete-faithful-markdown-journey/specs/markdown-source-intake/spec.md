## MODIFIED Requirements

### Requirement: Source context is preserved for recovery
The failed intake state SHALL preserve the currently selected file or pasted Markdown and MUST NOT replace or clear the active confirmed trip. The user SHALL be able to retry the same source or replace, edit, remove or change it through the existing intake controls. When unchanged selected Markdown has already produced a validated `TextSourceInput` and `UnifiedSourceDocument`, downstream retry SHALL reuse that prepared source and its `source_id`, evidence-unit identities and locators while creating fresh workflow session/request identities. Editing, replacing, removing or clearing the selection MUST invalidate prepared-source reuse.

#### Scenario: Retry after provider or output-validation failure
- **WHEN** interpretation or response validation fails after source-document validation and the traveler retries unchanged selected Markdown
- **THEN** a fresh coordinated request reuses the validated prepared source, reruns only required downstream stages and cannot duplicate the completed failed request

#### Scenario: Retry after an early source failure
- **WHEN** reading, extraction or source-document validation failed before a validated prepared source existed
- **THEN** retry reruns the incomplete source stages while preserving the selected content and active confirmed trip

#### Scenario: Selected source changes before retry
- **WHEN** the traveler edits pasted Markdown or replaces, removes or clears the selected file
- **THEN** the previous prepared source is invalidated and cannot be reused for the new submission
