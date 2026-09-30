## ADDED Requirements

### Requirement: Unified newspaper surface grammar
The application SHALL present Home, Markdown intake, progress, Review, confirmation, recoverable failure, generalized Overview and Day, and compatible Golden Viewer surfaces as one Chinese-newspaper editorial system using white paper, black ink, typography, whitespace, and hairlines. These surfaces MUST NOT use cards, rounded containers, shadows, ornamental elevation, travel-SaaS gradients, or large semantic color fills as their primary hierarchy.

#### Scenario: Workflow crosses multiple surfaces
- **WHEN** a user moves from Home through progress and Review to confirmation and Result
- **THEN** each surface uses the same editorial paper, type hierarchy, hairline, rectangular-control, and restrained semantic-marker grammar without changing the underlying workflow actions

#### Scenario: Recoverable failure is shown
- **WHEN** intake, provider, validation, or confirmation enters a recoverable failure state
- **THEN** the failure is readable through editorial text, hairlines, a restrained needs-attention marker, and rectangular recovery actions rather than a rounded elevated alert card

### Requirement: Frozen light-paper visual roles
The application SHALL implement the V0 light-only token roles from `spec/06_RESULT_UI_SPEC.md`: paper `#ffffff`, sunk utility surface `#f5f4f1`, ink `#121212`, muted text `#5a5a5a`, faint text `#8c8c8c`, hairline `rgba(0,0,0,.17)`, fixed anchor `#b8491f`, readiness/flexible `#0d6f63`, alternative `#b03f4a`, tentative/needs-attention `#7d6a10`, and movement/supporting accent `#1a3a4a`. V0 SHALL NOT expose or validate a separate dark visual mode.

#### Scenario: Supported theme loads
- **WHEN** any production surface renders under the supported V0 theme
- **THEN** the light paper roles and frozen token values are applied consistently and no dark-mode variant changes their meaning

#### Scenario: Several semantic states coexist
- **WHEN** fixed, flexible, alternative, tentative, and movement content appear in the same reading flow
- **THEN** each uses only its approved restrained role without creating a rainbow event taxonomy or large tinted panel

### Requirement: Editorial typography remains available offline
The application SHALL use `Noto Serif TC`, Georgia, `Times New Roman`, serif fallback for trip/day identity, event titles, and reading text; `Noto Sans TC`, system sans-serif fallback for time, metadata, labels, buttons, and controls; and platform `ui-monospace`/Menlo fallback for source excerpts. Required production font delivery MUST NOT make itinerary readability depend on a third-party runtime network request.

#### Scenario: Webfont loading fails
- **WHEN** a bundled font asset is unavailable or fails to load
- **THEN** the declared fallback stack renders every workflow and itinerary surface without hiding content or blocking navigation

#### Scenario: Review evidence renders
- **WHEN** Review displays a source excerpt beside interpreted content
- **THEN** the excerpt uses the monospace role while interpretation and correction content preserve the editorial serif and utility sans hierarchy

### Requirement: Rectangular controls preserve accessible operation
Primary actions SHALL use solid black with white text; secondary actions SHALL use underlined text or a thin rectangular border where a larger target is needed; fields, disclosures, and date controls SHALL be rectangular. Primary controls MUST remain keyboard operable with visible focus, and mobile interactive targets MUST be at least 44px.

#### Scenario: Mobile intake is operated by touch
- **WHEN** Home and Markdown intake render at the required mobile viewport
- **THEN** upload, paste, parse, clear, settings, import, sample, retry, and return actions remain at least 44px where interactive and do not cause horizontal overflow

#### Scenario: Review is operated by keyboard
- **WHEN** a keyboard-only user navigates Review and confirmation
- **THEN** evidence, fields, flag controls, add/delete/revert actions, confirmation, and cancellation have a logical focus order and visible focus treatment

### Requirement: Semantic markers do not replace semantic text
Semantic color SHALL appear only as a 4px vertical marker or restrained text/link accent and MUST be accompanied by readable text, structure, or state labels. Readiness MUST remain dependency preparedness rather than event completion, and provenance labels such as `你的校正` MUST remain distinct from itinerary intent.

#### Scenario: Readiness and user correction appear together
- **WHEN** a reviewed entity has a user-authored correction and a readiness dependency
- **THEN** the interface separately communicates correction provenance and readiness state without implying the event is completed or relying on color alone

#### Scenario: Optional content is displayed
- **WHEN** optional or flexible content appears on Day
- **THEN** the marker and text preserve its lower-pressure meaning without a disabled, overdue, or checklist treatment

### Requirement: Responsive editorial continuity
Mobile SHALL prioritize one reading task at a time, and desktop SHALL present the same travel document with coordinated supporting context while keeping the primary reading measure at approximately 680px. Information MAY move between inline, nested, and supporting regions, but semantic emphasis, actions, and state meaning MUST remain equivalent and layouts MUST avoid horizontal overflow.

#### Scenario: Workflow renders at mobile and desktop widths
- **WHEN** the same Home, Review, confirmation, failure, Overview, or Day state is opened at required mobile and normal desktop viewports
- **THEN** both widths expose equivalent content and actions while desktop uses added width for orientation rather than dashboard modules

#### Scenario: Long content is present
- **WHEN** a trip title, source excerpt, unresolved place, or supporting instruction is unusually long
- **THEN** the reading flow wraps or nests the content without clipping controls, stretching the primary measure, or creating horizontal page overflow

### Requirement: Visual migration preserves workflow and scope boundaries
The newspaper migration SHALL NOT change supported input formats, Gemini request/provider behavior, browser-local credential policy, durable storage exclusions, candidate isolation, authoritative confirmation, Canonical JSON import, generalized navigation scope, or Hosted Delivery gates. An existing active trip MUST remain readable throughout replacement failures and cancellation.

#### Scenario: Prototype-only input is attempted
- **WHEN** a user supplies PDF or Spreadsheet input during V0
- **THEN** the existing unsupported/gated behavior remains in force and the newspaper interface does not present the format as operable

#### Scenario: Replacement import fails after restyling
- **WHEN** parsing, validation, or persistence fails while an active confirmed trip exists
- **THEN** recovery actions use the newspaper grammar and the original trip remains readable and unchanged

#### Scenario: Runtime data is unavailable
- **WHEN** a runtime-dependent Golden surface cannot establish a supported value
- **THEN** static itinerary content remains usable and no generalized Today, NOW, NEXT, or leave-by claim is invented

