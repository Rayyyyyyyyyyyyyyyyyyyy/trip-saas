## ADDED Requirements

### Requirement: Failed reading exits to a visible Home notice
When reading, extraction, interpretation, response validation, or final pre-Review validation fails, the blocking intake dialog SHALL close and Home SHALL display a visible failure notice headed `行程讀取失敗`. The notice MUST explain the safe failure phase and state that the current confirmed trip was not changed.

#### Scenario: File reading fails
- **WHEN** the selected Markdown file cannot be read or normalized
- **THEN** Home displays `行程讀取失敗` with a safe file-reading message and does not change the current confirmed trip

#### Scenario: Gemini request fails
- **WHEN** the provider request fails, times out, is rate limited, or rejects the credential
- **THEN** Home displays `行程讀取失敗` with a safe provider-phase message and does not expose raw HTTP or credential details

#### Scenario: Provider accepts the request and never answers
- **WHEN** an interpretation request passes the send deadline without a response
- **THEN** the attempt is aborted, the full-screen interaction lock is released, and Home displays the safe timed-out provider message instead of waiting indefinitely

#### Scenario: Provider answers with an error status
- **WHEN** the provider returns a refused request, a provider-side fault, or a refused credential
- **THEN** Home distinguishes each from a lost connection and never instructs the user to check the network for a request the provider actually answered

#### Scenario: Gemini response fails validation
- **WHEN** Gemini returns JSON that fails response schema, coverage, or pre-Review validation
- **THEN** Home displays `行程讀取失敗` with a safe validation-phase message instead of silently appearing to navigate away

### Requirement: Source context is preserved for recovery
The failed intake state SHALL preserve the currently selected file or pasted Markdown and MUST NOT replace or clear the active confirmed trip. The user SHALL be able to retry the same source or replace, edit, remove, or change the source through the existing intake controls.

#### Scenario: Retry after validation failure
- **WHEN** response validation fails and the user chooses the retry action
- **THEN** a fresh coordinated request starts with the preserved source and cannot duplicate the completed failed request

#### Scenario: Replace a failed file
- **WHEN** a selected file fails and the user chooses to replace or remove it
- **THEN** the stale failure notice clears and the new empty or selected-file state is shown

#### Scenario: Edit failed pasted content
- **WHEN** pasted Markdown fails and the user edits or clears it
- **THEN** the stale failure notice clears and the intake returns to the corresponding editable state

### Requirement: Failure state restores accessible context
After the full-screen intake dialog closes because of failure, keyboard focus SHALL move to the visible failure notice. The notice SHALL use alert semantics, remain readable at mobile and desktop viewports, and leave retry and source-replacement controls in a logical focus order.

#### Scenario: Blocking dialog fails while keyboard is in use
- **WHEN** an asynchronous intake stage fails while the full-screen dialog owns focus
- **THEN** the dialog closes, the `行程讀取失敗` notice receives focus, and assistive technology announces the failure once

#### Scenario: Failure message contains long source identity
- **WHEN** the preserved file has a long name or localized characters
- **THEN** the notice and recovery controls remain readable without horizontal overflow or clipped actions

### Requirement: Failure copy is safe and phase-specific
The failure notice SHALL use a stable heading and a provider-neutral safe message derived from a bounded failure descriptor. It MUST NOT render arbitrary thrown messages, raw provider responses, schema paths, credentials, thought signatures, or source excerpts.

#### Scenario: Unknown implementation error reaches intake
- **WHEN** an unexpected error does not carry a recognized safe failure descriptor
- **THEN** Home displays a generic recoverable `行程讀取失敗` message, preserves the source, and does not interpolate the thrown value

#### Scenario: Recognized response-validation failure reaches intake
- **WHEN** the workflow reports a recognized response-validation failure
- **THEN** Home distinguishes that the returned structure did not pass checking while keeping implementation diagnostics private
