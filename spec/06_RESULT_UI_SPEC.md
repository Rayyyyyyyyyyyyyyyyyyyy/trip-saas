# Trip Runtime — Result UI Contract

> Status: Approved UI Direction Contract — September 2026 newspaper prototype synced; implementation revalidation and final benchmark acceptance pending
> Scope: Shared product visual language; Confirmed CanonicalTrip → Presentation Projection → Result UI semantic presentation.

## 1. Purpose

Make a confirmed itinerary faster to use during travel than the original planning artifact.
Primary question:

> Can the traveler understand what matters in a few seconds?

## 2. Presentation boundary

```text
Confirmed CanonicalTrip
→ Presentation Projection
→ Semantic UI Templates
→ Result UI
```

CanonicalTrip defines:
what the trip means.
Presentation defines:
how confirmed semantics are emphasized.
Do not write UI-only styling into CanonicalTrip.

Presentation Projection also owns placement. Each Day exposes one ordered,
discriminated display tree with exactly one primary placement per canonical
entity. Summaries may reference a placed entity compactly, but neither
Projection nor Result UI may render the same full entity independently and
again inside a relationship group.

## 3. Renderer invariant

Result UI is source-agnostic.
Forbidden:

```text
source format → source-shaped UI family
```

Required:

```text
Canonical semantic + runtime state
→ presentation treatment
```

Implementation styling ownership:

- Tailwind/project classes are the primary authoring surface for static layout,
  spacing, responsive composition, component visuals, and approved design
  tokens.
- MUI owns accessible interactive primitives and their behavior.
- MUI `sx` is secondary and is reserved for MUI internal selectors,
  theme-aware component states, or genuinely dynamic values that Tailwind
  cannot express cleanly.
- The same CSS property must not be declared in both `className` and `sx` on
  one element; styling precedence must not depend on injection order.

## 4. Visual thesis

```text
Chinese Newspaper Editorial
×
Runtime Clarity
×
Travel-day Utility
```

Direction:

- Chinese-language editorial newspaper
- white paper / black ink
- utility-first
- mobile-first
- travel-specific without template cliché

Avoid:

- dashboard density
- card-everything
- teal travel SaaS gradients
- rounded container language
- shadows and ornamental elevation
- semantic background-color blocks
- recommendation/social feeds
- excessive destination photography
- gamification
- generic travel copy

The September 2026 mobile and desktop prototypes under
`temp/Mobile app and web design/` are the approved visual reference. This
contract is the durable product authority after the prototype decisions are
synced; prototype-only capabilities do not override roadmap or source-format
scope.

Surface grammar:

- applies consistently to Home, intake/progress, Review, confirmation, failure,
  Overview, and Day; workflow behavior remains owned by `07_FUNCTIONAL_SPEC.md`
- one white reading sheet; hierarchy comes from type, whitespace, and hairlines
- no cards, shadows, or rounded containers
- primary dividers use thin black lines at low opacity
- semantic color appears as a 4px vertical marker or restrained text accent,
  never as a large tinted surface
- primary actions use solid black with white text
- secondary actions are plain text with an underline or a thin rectangular
  border when a larger target is required
- form controls and date controls are rectangular
- image/credential/supporting-reference frames use a thin rectangular border
  and must not imply that an absent asset exists

Approval of the direction does not by itself validate:

- sticky/overflow mechanics
- accessibility
- implementation correctness

Exact color and font-family tokens are frozen in §§19–20 from the September
2026 prototype. Component type metrics and the remaining mechanics are still
subject to the checks in §21.

## 5. View scope

### Generalized V0

- Overview
- Day

### Golden Viewer / later runtime track

- Today
- Reservations
- Map
- NOW/NEXT/leave-by
  Current checked-in Osaka viewer behavior remains a real-use reference. No discarded-branch implementation is inherited, and reference capability does not expand generalized V0 acceptance scope.

## 6. Semantic presentation grammar

```text
Flight
Accommodation
Fixed Event
Activity
Restaurant
Free Time
Optional
Alternative Group
Conditional / Fallback
Transit
Reservation / Readiness
Note
Runtime Instruction
Supporting Reference
Internal Timetable
```

Template ≠ Card.
Allowed surfaces:

- plain block
- prominent block
- inline metadata
- restrained status label
- connector
- nested content
- secondary surface
- bordered evidence/reference frame

## 7. Semantic modifiers

Preserve:

- exact
- approximate
- daypart
- open-ended
- no-time
- reserved/ready
- action-needed
- optional
- tentative
- unresolved
- conditional/fallback
- all-day
  Invariant:

> Visual precision must not exceed source precision.

When provenance is intentionally exposed, `你的校正` is an allowed supporting label for a user override. It identifies authority/provenance and must not become itinerary intent.

## 8. Overview contract

Purpose:
pre-trip orientation and trip compression.
Reading order:

```text
Trip Identity
→ Dates / Geography
→ Journey / destination sequence
→ Readiness attention, if any
→ Critical travel anchors
→ Day Journey Index
```

Rules:

- no KPI dashboard
- no fake route geometry
- journey derived only from supported trip facts
- no readiness issue → omit readiness attention treatment; a collapsed, low-emphasis completion summary may remain
- absent flight/hotel → omit placeholder
- day index supports fast scan + navigation

Approved composition:

- mobile follows the reading order as one continuous travel document
- desktop keeps the primary reading measure narrow; the Overview content column
  is capped at approximately 680px
- desktop may place readiness and critical anchors beside the day index inside
  that editorial measure, separated by whitespace or hairlines rather than
  cards
- desktop width must improve simultaneous orientation, not introduce dashboard
  modules or KPIs

## 9. Day contract

Purpose:
primary single-day reading surface.
Hierarchy:

```text
Date navigation/orientation
→ Day identity
→ day context
→ nearest fixed anchor, if any
→ semantic timeline
→ optional disclosure
→ supporting/personal context
```

Rules:

- fixed anchors outrank flexible content
- time appears immediately before the title on the same reading line where
  applicable; it uses small tabular utility type rather than a detached card or
  oversized time column
- no fake time for untimed items
- when an untimed/ambiguous canonical time retains `raw_text`, show that expression faithfully (for example, `8點`) without converting it into a known start or a NOW/NEXT anchor; when no raw expression exists, retain the normal untimed treatment
- transit = connective tissue
- flexible space stays intentionally open
- optional stays outside main committed hierarchy
- no fixed anchor → omit anchor surface
- long supporting content → secondary/nested treatment
- each canonical entity has exactly one primary Day placement; a relationship member does not also render as a standalone full timeline entity
- a fixed-anchor or Overview summary may carry a compact reference to an already placed entity, but never a second full rendering
- sequence relationships constrain reading order without adding another full group
- alternative, conditional, fallback, and parent/child groups preserve each member's supported time precision, place, modifiers, dependencies, notes, unresolved state, and exact actions
- incompatible multiple primary relationship groups are blocked before confirmation rather than silently resolved by Result UI

Approved composition:

- mobile uses a horizontal Date Rail followed by one primary Day reading column
- desktop uses three coordinated regions: Day navigation rail, a primary
  semantic timeline capped at approximately 680px, and secondary supporting
  context
- fixed-anchor summary belongs before or beside the timeline, never below optional/supporting content
- optional and supporting content may be collapsed/nested on mobile and visible in the secondary desktop region
- when a Day has one dominant fixed anchor, `今天唯一不能動的` is an allowed summary phrase
- a fixed anchor may show a 4:3 thin-line credential/reference frame (for
  example a boarding pass, booking code, reservation record, or appointment
  record) only when the corresponding supporting reference exists; do not
  fabricate or permanently reserve an empty production asset

## 10. Free Time

First-class itinerary content.
Do not:

- checkbox it
- mark incomplete
- invent precise time
- turn it into a rigid task card
  Use:
- whitespace
- lower pressure
- flexible hierarchy

## 11. Optional

Allowed product phrase:
`IF YOU STILL HAVE ENERGY` / `還有體力的話`
Rules:

- outside committed hierarchy
- visible but secondary
- never disabled-looking
- never task-like

## 12. Alternative / Conditional

Preserve relationship.
Example:

```text
Dinner
├─ Option A
├─ Option B
└─ Return to hotel
```

Do not flatten structured choice into an ambiguous single title.

The relationship group owns the primary placement of its members. It must
expose the same supported time/place/modifier/dependency/note/unresolved/action
treatments available to a standalone entity, and must not reduce members to
title-only copies or duplicate them elsewhere in the Day display tree.

## 13. Transit

Default:

```text
Event A
  │
  │ 27 min · JR
  ↓
Event B
```

Promote transport only when transport itself is a critical booked entity.

## 14. Reservation / readiness

Readiness = dependency preparedness, not event completion.
Examples:

- reservation
- ticket
- document
- payment

```text
ready ≠ completed
```

When readiness is interactive:

- each item may be marked `已備妥` / `待備妥` independently
- a bulk `全部標記為已備妥` action is allowed
- when all items are ready, collapse the section to a low-emphasis summary with
  an explicit way to inspect or reset it
- do not use completion-task language or imply the underlying event happened

## 15. Supporting reference

Examples:

- timetable
- route diagram
- venue map
- ticket instructions
- booking rule
- reference image
  Default:
  secondary/nested access, not top-level event promotion.

Source locator/provenance may appear as low-priority supporting context. The Result renderer still consumes only Presentation Projection and never raw source evidence.

## 16. Today runtime boundary

Today is not a smaller Day view.
Real Today priority:

```text
NOW
NEXT
LEAVE BY
```

Render only when supported by confirmed Trip Data + valid Runtime Data.
Otherwise omit.
Do not guess.
Detailed Today composition is a later runtime UI spec.

## 17. Navigation

Approved navigation direction:

- changing Day reorients the reader to that Day's identity/start
- mobile Day uses a horizontally scrollable Date Rail with a clearly selected date
- desktop Day uses a persistent vertical Day rail with date + short day identity
- Date Rail controls are thin rectangular date blocks; the active date uses
  black fill with white text, while inactive dates remain white with a thin
  border
- Overview day rows and either Date Rail open the same source-agnostic Day surface
- overflow navigation remains keyboard-operable and keeps the active date visible

Still implementation-tunable:

- exact sticky offsets/thresholds
- scroll animation
- overflow controls and edge affordances

Whether URL/history updates use routes or local state is explicitly deferred to
a separate project-architecture decision. It is not a visual-design decision.

Prototype screen-switching controls are not the production navigation API.

## 18. Mobile / desktop

Mobile is primary.
Assume:

- one hand
- walking
- platform use
- 3-second glance
  Desktop is the same travel document at wider measure, not a dashboard.

Responsive treatment:

- mobile prioritizes one reading task at a time
- desktop may keep supporting/personal context simultaneously visible, but the
  primary reading column does not stretch beyond approximately 680px
- information may move between inline, nested, and secondary regions, but semantic emphasis/order must remain equivalent
- desktop must not create new itinerary facts or a different source-specific UI family

## 19. Visual roles

The September 2026 mobile/desktop prototype is the visual token source of
truth. The primary tokens are frozen as:

| Role                            | Token                  | Usage |
| ------------------------------- | ---------------------: | ----- |
| reading paper                   |              `#ffffff` | main application sheet |
| surrounding prototype canvas    |              `#e7e5e0` | preview/outer canvas only; production may use paper edge-to-edge |
| sunk utility surface            |              `#f5f4f1` | restrained control grouping only |
| reading ink                     |              `#121212` | headings, body, primary action |
| muted text                      |              `#5a5a5a` | secondary content |
| faint text                      |              `#8c8c8c` | tertiary metadata |
| hairline                        | `rgba(0,0,0,.17)`      | separators and rectangular frames |
| fixed anchor marker             |              `#b8491f` | 4px rule / restrained label |
| readiness / flexible marker     |              `#0d6f63` | 4px rule / restrained label / links |
| alternative group marker        |              `#b03f4a` | 4px rule / restrained label |
| tentative / needs-attention     |              `#7d6a10` | 4px rule / restrained label |
| movement/supporting text accent |              `#1a3a4a` | secondary connective emphasis only |

There is no dark-mode visual contract in V0. The product implements and
validates the light paper system only.

Do not use rainbow event taxonomy.

## 20. Typography roles

- editorial serif: `Noto Serif TC`, Georgia, `Times New Roman`, serif fallback,
  for trip/day identity, event titles, and reading text
- utility sans: `Noto Sans TC`, system sans-serif fallback, for time, metadata,
  buttons, compact labels, and controls
- monospace source excerpts: platform `ui-monospace`/Menlo fallback

Component-level size and line-height may remain responsive, but must follow the
prototype hierarchy rather than introducing a new type system.

## 21. Historical Golden Screen evidence and current revalidation

Previous pre-newspaper viewer QA covered:

- Overview mobile/desktop
- Uji Day mobile/desktop
- no horizontal overflow
- 44px minimum mobile controls
- no browser console errors
- keyboard-operable primary controls
- light/dark semantic contrast checks for the superseded visual system
- stress fixtures for optional/reservation/all-day/approximate/open-ended/alternative/missing-anchor cases

Previous design review covered:

- hierarchy
- rhythm
- semantic treatment
- surface language
- navigation behavior

This is historical reference evidence, not validation of the current
clean-start implementation, Generalized Product V0, or the newspaper visual
system. The exact tokens and grammar in §§4 and 19–20 are the approved product
direction. Implementation must re-run the applicable viewport, overflow,
console, keyboard, light-mode contrast, and semantic stress checks before
acceptance. A failed accessibility check may require an explicit token
revision; it does not silently authorize a different visual system.

## 22. UI state matrix

| Condition              | Required behavior                                                                 |
| ---------------------- | --------------------------------------------------------------------------------- |
| no fixed anchor        | omit anchor summary                                                               |
| approximate time       | visibly non-exact                                                                 |
| open-ended time        | known start, unknown end                                                          |
| no-time                | no fake timeline position                                                         |
| no flight/hotel        | omit placeholder                                                                  |
| all readiness complete | omit attention treatment; may retain a collapsed, low-emphasis completion summary |
| optional-heavy         | keep outside committed hierarchy                                                  |
| free-time-heavy        | preserve spacious treatment                                                       |
| transit absent         | do not invent                                                                     |
| broken external link   | do not render dead action                                                         |
| unresolved place       | show unresolved state                                                             |
| runtime unavailable    | static trip remains usable                                                        |

## 23. Iteration test

Before accepting a UI change ask:

1. Does it improve runtime comprehension?
2. Does it preserve Canonical semantics?
3. Does it generalize beyond Golden Input #001?
4. Is it presentation-only, or secretly inventing product data?
   If it fails, do not promote it into the UI contract.

## 24. Prototype-to-product boundary

The September 2026 prototype is authoritative for visual language and the
interaction compositions explicitly adopted by this spec. It is not authority
for product scope, persistence, provider policy, source-format roadmap, or
hosted delivery.

In particular, prototype screens must not be used to:

- enable PDF or Spreadsheet intake before their owning roadmap gates
- replace the approved browser-local Gemini credential persistence policy with
  session-only storage
- add a local semantic-parser fallback that bypasses the approved Gemini path
- remove Canonical JSON import from Generalized V0
- remove or implement Hosted Delivery Lite outside its benchmark gate
- expose Today in Generalized V0 navigation
