## MODIFIED Requirements

### Requirement: Overview trip compression
Overview SHALL present available trip identity, date range, geography/journey sequence, readiness attention, critical anchors, and day index in a continuous editorial reading order that compresses trip structure better than the source. Mobile SHALL use one travel-document flow; desktop SHALL keep the primary content measure at approximately 680px and MAY coordinate readiness or anchors beside the day index within that measure using whitespace or hairlines rather than cards. Missing flights, hotels, reservations, or readiness issues MUST be omitted rather than replaced with fake placeholders.

#### Scenario: Trip has no flight or hotel
- **WHEN** CanonicalTrip contains neither flight nor accommodation entities
- **THEN** Overview omits those sections and does not render empty or invented records

#### Scenario: User selects an Overview day
- **WHEN** the user activates a day in the journey index
- **THEN** the source-agnostic Day surface opens for that same day identity

#### Scenario: Overview renders on desktop
- **WHEN** a confirmed trip is opened at the required desktop viewport
- **THEN** its primary reading flow remains approximately 680px wide and added width improves orientation without introducing KPI or card-dashboard modules

### Requirement: Day semantic reading order
Day SHALL present date navigation/orientation, day identity/context, nearest fixed anchor when available, semantic timeline, optional disclosure, and supporting context. It SHALL preserve source-supported event order and MUST omit a fixed-anchor summary when no fixed anchor exists. Supported time SHALL appear immediately before the event title on the same reading line where practical, using small tabular utility type; untimed content MUST NOT receive a fabricated time position. Mobile SHALL use one primary Day reading column, while desktop SHALL coordinate day navigation, an approximately 680px primary timeline, and secondary supporting context without changing semantic meaning.

#### Scenario: Day has no fixed anchor
- **WHEN** a confirmed day contains only flexible or untimed content
- **THEN** Day omits the fixed-anchor surface and preserves the content without inventing an anchor

#### Scenario: Timed and untimed content appear together
- **WHEN** a Day contains a source-supported exact time and an intentionally untimed item
- **THEN** the exact time appears immediately before its title in the utility role and the untimed item remains readable without a fake time label or timeline position

#### Scenario: Supporting context changes region
- **WHEN** the same Day is viewed at mobile and desktop widths
- **THEN** supporting content may move from nested disclosure to a secondary desktop region while its facts, actions, and semantic priority remain unchanged

### Requirement: Responsive composition preserves capability parity
Mobile SHALL use a horizontal rectangular Date Rail and one primary Day reading column. Desktop SHALL use coordinated persistent day navigation, a primary timeline capped at approximately 680px, and supporting-context regions without becoming a dashboard. Both widths SHALL expose equivalent itinerary semantics and navigation actions. The active date SHALL use black fill with white text, inactive dates SHALL remain white with a thin border, and changing the active day SHALL keep its control visible and reorient reading focus/scroll to that Day's identity/start.

#### Scenario: Active day changes on mobile
- **WHEN** the user selects a different date in the horizontal rail
- **THEN** the active rectangular date remains visible with black fill and white text and the reading position reorients to that Day's identity/start

#### Scenario: Active day changes by keyboard on desktop
- **WHEN** the user operates persistent day navigation with a keyboard
- **THEN** the same Day surface opens with visible focus, the approximately 680px primary measure, and no capability difference from pointer navigation

#### Scenario: Date Rail overflows
- **WHEN** the trip contains more dates than fit in the mobile Date Rail viewport
- **THEN** overflow remains keyboard and touch operable, the selected date can be brought into view, and the page does not gain horizontal overflow

### Requirement: Approved semantic visual system
Result UI SHALL implement the September 2026 Chinese-newspaper light-paper roles from `06_RESULT_UI_SPEC.md`: white paper, `#121212` reading ink, approved muted/faint text and hairline values, `Noto Serif TC`/`Noto Sans TC`/monospace typography roles, rectangular controls, solid-black primary actions, and approved 4px semantic markers. Result UI SHALL use MUI primitives for interactive behavior and Tailwind/project classes as the primary styling surface for static layout, spacing, responsive composition, component visuals, and approved tokens. MUI `sx` SHALL remain secondary to MUI internal selectors, theme-aware component states, or genuinely dynamic values, and the same CSS property MUST NOT be declared in both `className` and `sx` on one element. Result UI SHALL NOT introduce dark-mode behavior, cards, rounded containers, shadows, large semantic color fills, rainbow event taxonomy, or a parallel handcrafted component system.

#### Scenario: Semantic states are shown together
- **WHEN** fixed anchors, flexible content, attention, alternatives, and transit appear on one Day
- **THEN** each uses its approved 4px marker or restrained accent plus readable text/structure on the light paper system without arbitrary event colors or tinted cards

#### Scenario: Result controls render
- **WHEN** Date Rail, readiness, optional disclosure, and external actions appear together
- **THEN** controls use the shared rectangular action language, remain visibly focusable, and preserve their distinct semantic behavior

### Requirement: Golden Viewer remains an explicit fallback
The checked-in Osaka trip SHALL remain available as an explicit Golden sample/fallback and SHALL apply the shared newspaper visual grammar while preserving exact source-provided links, Tokyo-time behavior, trip-scoped checklist/reservation compatibility, the USJ unconfirmed default, and static runtime fallback. Its Golden-only Today, reservation, checklist, NOW/NEXT, and leave-by capabilities MUST NOT expand generalized V0 navigation or acceptance scope.

#### Scenario: User explicitly opens the Golden sample
- **WHEN** the user activates the Osaka sample/fallback action
- **THEN** the application opens the real Golden trip in the shared newspaper grammar through validated local data without treating it as an automatically active trip on clean start

#### Scenario: Golden runtime is unavailable
- **WHEN** the Golden Viewer cannot establish a supported runtime value
- **THEN** its static itinerary, exact links, and checklist/reservation state remain usable without guessed NOW, NEXT, or leave-by output

