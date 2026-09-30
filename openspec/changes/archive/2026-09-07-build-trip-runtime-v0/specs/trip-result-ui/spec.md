## ADDED Requirements

### Requirement: Canonical-only presentation boundary
Result UI SHALL consume a deterministic Presentation Projection derived from validated CanonicalTrip and SHALL NOT read raw Markdown, source documents, provider responses, ParsedTripDraft, Review excerpts, or source-format-specific objects.

#### Scenario: Same semantics originate from different sources
- **WHEN** two supported sources eventually produce equivalent CanonicalTrip semantics
- **THEN** Presentation Projection selects the same semantic templates without branching on source format

### Requirement: Home and Viewer entry behavior
When a valid active trip exists, reload SHALL open its Viewer directly and SHALL keep trip reading independent of Gemini credentials. Starting a replacement SHALL not make the candidate the Viewer source until confirmation commits.

#### Scenario: Stored key is absent
- **WHEN** a valid active trip loads without a Gemini key
- **THEN** Overview and Day remain fully readable

### Requirement: Overview trip compression
Overview SHALL present available trip identity, date range, geography/journey sequence, readiness attention, critical anchors, and day index in a reading order that compresses trip structure better than the source. Missing flights, hotels, reservations, or readiness issues MUST be omitted rather than replaced with fake placeholders.

#### Scenario: Trip has no flight or hotel
- **WHEN** CanonicalTrip contains neither flight nor accommodation entities
- **THEN** Overview omits those sections and does not render empty or invented records

#### Scenario: User selects an Overview day
- **WHEN** the user activates a day in the journey index
- **THEN** the source-agnostic Day surface opens for that same day identity

### Requirement: Day semantic reading order
Day SHALL present date navigation/orientation, day identity/context, nearest fixed anchor when available, semantic timeline, optional disclosure, and supporting context. It SHALL preserve source-supported event order and MUST omit a fixed-anchor summary when no fixed anchor exists.

#### Scenario: Day has no fixed anchor
- **WHEN** a confirmed day contains only flexible or untimed content
- **THEN** Day omits the fixed-anchor surface and preserves the content without inventing an anchor

### Requirement: Visual precision does not exceed source precision
Time presentation SHALL distinguish exact, approximate, range, daypart, no-time, open-ended, all-day, and cross-midnight semantics. It MUST NOT place untimed content at a fabricated time or render approximate/range values as exact.

#### Scenario: Approximate event renders
- **WHEN** an entity has approximate time precision around 10:30
- **THEN** Day visibly communicates approximation rather than showing a bare exact `10:30`

#### Scenario: Open-ended event renders
- **WHEN** an entity starts at 18:30 with unknown end
- **THEN** Day communicates the known start and open-ended end without inventing a duration

#### Scenario: Untimed event renders
- **WHEN** an entity has `time.kind = none`
- **THEN** it appears in an untimed/flexible semantic position with no fake time label

### Requirement: Flexible and optional intent remains non-task-like
Free time and flexible content SHALL remain first-class, low-pressure itinerary content without checkboxes or incomplete status. Optional content SHALL remain visible outside the committed hierarchy and SHALL NOT appear disabled or overdue.

#### Scenario: Optional free-time item renders
- **WHEN** an entity is both optional and flexible free time
- **THEN** it appears in the optional disclosure with flexible treatment and no task-completion affordance

### Requirement: Relationships remain structured
Alternative, conditional, fallback, sequence, and parent/child relationships SHALL remain visibly understandable and MUST NOT be flattened into unrelated titles or a single ambiguous string.

#### Scenario: Dinner has two alternatives
- **WHEN** CanonicalTrip represents Option A and Option B as an alternative group
- **THEN** Day renders both choices within one identifiable relationship group

### Requirement: Transit is connective tissue
Source-provided transit SHALL render as a connector between related events by default. Transport SHALL become a prominent event only when its Canonical semantic type and importance support that treatment. Missing transit MUST NOT be invented.

#### Scenario: Source includes transit text
- **WHEN** two events are linked by source-provided transit guidance
- **THEN** the guidance appears as a connector preserving its supported text

#### Scenario: No transit is provided
- **WHEN** adjacent events have no confirmed transit relation
- **THEN** Result UI does not synthesize a route, duration, or connector claim

### Requirement: Readiness is distinct from completion
Reservation, ticket, document, payment, and readiness presentation SHALL communicate dependency preparedness and MUST NOT imply that the associated event has been completed.

#### Scenario: Ticket is ready before the event
- **WHEN** an event's ticket readiness is ready
- **THEN** the UI communicates ticket readiness without marking the event itself complete

### Requirement: Exact source actions are preserved safely
When CanonicalTrip contains a valid exact source-provided URL, Result UI SHALL use that exact URL, open external actions in a new tab, and set safe `rel` attributes. It MUST NOT reconstruct a different map/restaurant URL or synthesize one when absent.

#### Scenario: Exact map URL exists
- **WHEN** a confirmed entity contains a source-provided Google Maps URL
- **THEN** the action uses the unchanged URL with safe external-link behavior

#### Scenario: Place text has no URL
- **WHEN** an entity contains unresolved place text but no confirmed link
- **THEN** the UI shows the unresolved place state without generating a guessed map query

### Requirement: Responsive composition preserves capability parity
Mobile SHALL use a horizontal Date Rail and one primary Day reading column. Desktop SHALL use coordinated day navigation, primary timeline, and supporting-context regions without becoming a dashboard. Both widths SHALL expose equivalent itinerary semantics and navigation actions.

#### Scenario: Active day changes on mobile
- **WHEN** the user selects a different date in the horizontal rail
- **THEN** the active date remains visible and selected and the reading position reorients to that Day's identity/start

#### Scenario: Active day changes by keyboard on desktop
- **WHEN** the user operates persistent day navigation with a keyboard
- **THEN** the same Day surface opens with visible focus and no capability difference from pointer navigation

### Requirement: Approved semantic visual system
Result UI SHALL implement the approved semantic color and typography roles from `06_RESULT_UI_SPEC.md`, SHALL use MUI primitives for interactive behavior, and SHALL use Tailwind/project classes as the primary styling surface for static layout, spacing, responsive composition, component visuals, and approved tokens. MUI `sx` SHALL remain secondary to MUI internal selectors, theme-aware component states, or genuinely dynamic values, and the same CSS property MUST NOT be declared in both `className` and `sx` on one element. Result UI SHALL NOT introduce rainbow event taxonomy or a parallel handcrafted component system.

#### Scenario: Semantic states are shown together
- **WHEN** fixed anchors, flexible content, attention, alternatives, and transit appear on one Day
- **THEN** each uses its approved semantic role consistently in light and dark modes without assigning arbitrary per-event colors

### Requirement: Runtime and navigation scope degrades safely
Generalized V0 production navigation SHALL expose Overview and Day only. Unsupported Today/NOW/NEXT/leave-by or runtime destinations SHALL be omitted; runtime failure MUST leave static Overview/Day usable and MUST NOT introduce guessed replacements.

#### Scenario: Runtime data is unavailable
- **WHEN** a Golden-only runtime surface cannot establish a supported NOW/NEXT value
- **THEN** unsupported runtime labels are omitted while the static itinerary remains accessible

### Requirement: Golden Viewer remains an explicit fallback
The checked-in Osaka trip SHALL remain available as an explicit Golden sample/fallback and SHALL preserve its exact source-provided links, Tokyo-time behavior, and trip-scoped checklist compatibility. Its Golden-only capabilities MUST NOT expand generalized V0 acceptance scope.

#### Scenario: User explicitly opens the Golden sample
- **WHEN** the user activates the Osaka sample/fallback action
- **THEN** the application opens the real Golden trip through validated local data without treating it as an automatically active trip on clean start

### Requirement: Result UI accessibility and integrity
Primary controls SHALL be keyboard operable, mobile interaction targets SHALL be at least 44px, layouts SHALL avoid horizontal overflow at required mobile/desktop viewports, semantic contrast SHALL pass the approved checks, and external/render failures SHALL not produce browser console errors.

#### Scenario: Mobile Day integrity check
- **WHEN** a semantic stress fixture is rendered at the required mobile breakpoint
- **THEN** controls remain at least 44px, no horizontal overflow occurs, and optional/approximate/open-ended/unresolved states remain distinguishable
