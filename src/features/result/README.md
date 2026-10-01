# Result feature ownership

Own pure Presentation Projection plus source-agnostic Overview and Day rendering. Result code must not read source or provider representations.

## Current implementation state

- `createTripPresentation` is the pure CanonicalTrip → Presentation Projection boundary.
- `ResultViewer`, `ResultOverview`, `ResultDay`, `ResultDateRail`, and the semantic entity/relationship templates accept Presentation Projection only. A repository architecture test rejects renderer imports from source, Review, provider, or trip-domain layers.
- `tripNavigation` is the single local screen/day navigation reducer reused by generalized Result and the Golden Viewer.
- `describeDependency` is the single reservation/ticket/readiness vocabulary; Overview and the entity template must not each carry a partial copy.
- The projection owns the Result clarity rules, so the Renderer never re-derives them:
  - `mapAction`: a source map URL first; otherwise a labeled Google Maps _search_ built from the verbatim place text via `mapSearchHref`, which the Golden Viewer shares; it projects both the visible label and accessible name, and is absent without a place.
  - `placeLine`: null when the title already contains the place.
  - `stateLabel`: at most one label, tentative before optional, and none for choose-one members; flexible is never a label.
  - `unrenderedSupportingIds`: unresolved image assets without a URL that are accounted for but never rendered as placeholders; resolved no-URL assets remain visible references.
  - `supportingItems` contains the existing ungrouped reference region; `supportingGroups` contains retained items ordered by group order with deterministic counts. Projection verification accounts for unrendered assets and rejects missing or duplicate placement.
- `ResultDateRail` always renders the `nav` landmark. With `tabSemantics` it additionally renders a complete `tablist`/`tabpanel` pair with `ResultDay`, with roving tabindex and matching `aria-controls`/`aria-labelledby`. Tab attributes are derived together, so they are never emitted without the panel they control.
- Only the Golden Viewer enables `tabSemantics`, because its date rail switches the day in place next to the other Viewer screens and matches the MUI `Tabs` rail the Golden Today/Overview screens already present. Generalized Result renders Day as its own page, so its rail stays plain navigation. In tab mode `ResultDay` leaves focus on the rail instead of pulling it to the day heading, or the roving tabindex would be stranded after the first activation.
- Generalized V0 exposes Overview and Day only. Golden Today/checklist/reservations remain owned by the Golden feature, while Golden Overview/Day use the shared projection templates.
- `ResultDay` renders projected supporting groups after ungrouped references as default-collapsed MUI disclosures. Disclosure state is component-local and never enters CanonicalTrip or persistence.
- The frozen light-paper semantic tokens are defined in `src/app/tripTheme.ts` and projected to Tailwind through runtime CSS variables. There is no dark palette; `06_RESULT_UI_SPEC.md` forbids a dark-mode substitution.

## Day placement contract

- Presentation Projection emits ordered discriminated `items` and a separate optional disclosure tree. Each entity has exactly one primary leaf on its Day; neither Renderer nor summaries deduplicate overlapping arrays.
- Recursive relationship members share the full entity template: supported time precision, place, modifiers, dependency status/reference/detail, notes, unresolved state, and exact safe actions. Parent/program presentation keeps the parent first and indents its internal schedule. Ordinary transit uses a small connector; fixed transport with booking/readiness significance uses a prominent entity.
- `createDayPlacement` in the trip domain owns placement and is reused by authoritative validation. Fully contained member groups nest; explicit parent references expand their descendant subtree. Crossing/equal primary groups and contradictory/interleaving sequences block confirmation. Sequence constrains the existing tree without adding a group.
- Mixed optional/main and cross-day groups keep relationship identity and context in their relevant tree fragments, but never copy a full entity across them. Fixed-anchor and Overview projections contain compact references, not full entity render inputs.

## Navigation ownership

`TripNavigationState` is the only local source of truth for the current Viewer screen and selected day identity. Overview, Golden Today, Date Rail, drawer, and bottom navigation dispatch into the same reducer; components must not keep synchronized selected-day copies or add a router for V0. The Golden boundary translates its legacy ISO-date identity to the projection's canonical day ID without creating another selected-day state.
