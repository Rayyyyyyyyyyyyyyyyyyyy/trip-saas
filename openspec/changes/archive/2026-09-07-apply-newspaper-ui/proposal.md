## Why

The current implementation predates the approved September 2026 Chinese-newspaper prototype, so its visual hierarchy and component surfaces no longer match the product contract. A focused migration is needed to apply the frozen light-paper visual system consistently without reopening V0 product, parser, persistence, or hosting scope.

## What Changes

- Replace the current rounded, elevated, card-oriented presentation with one shared white-paper/black-ink editorial grammar across Home, intake progress, Review, confirmation, recoverable failures, Overview, Day, and the Golden Viewer compatibility surfaces.
- Introduce the frozen `Noto Serif TC` / `Noto Sans TC` typography roles, approved monochrome and restrained semantic-marker tokens, hairline separators, rectangular controls, and solid-black primary actions.
- Recompose generalized Overview and Day around the approved narrow editorial reading measure, source-agnostic semantic hierarchy, mobile horizontal Date Rail, and coordinated desktop regions without changing CanonicalTrip or Presentation Projection ownership.
- Preserve workflow behavior and safety boundaries while restyling intake, progress, Review evidence/corrections, confirmation, and failure recovery; no source-format, parser, credential, persistence, or hosted-delivery policy changes are included.
- Revalidate mobile and desktop capability parity, 44px mobile controls, keyboard behavior, active-date visibility, horizontal overflow, light-mode contrast, console cleanliness, exact-link behavior, runtime fallback, semantic stress states, Golden compatibility, and External Markdown Benchmark #001 guardrails.
- Remove dark-mode acceptance from the V0 Result UI visual contract; V0 implements and validates the approved light-only paper system. **BREAKING** for the superseded dark visual presentation only; itinerary behavior and data contracts are unchanged.

## Capabilities

### New Capabilities

- `newspaper-ui-system`: Shared visual and responsive interaction grammar for workflow, Result, and Golden compatibility surfaces, including frozen tokens, typography, rectangular controls, semantic markers, and light-only accessibility requirements.

### Modified Capabilities

- `trip-result-ui`: Replace the superseded light/dark semantic visual requirement with the September 2026 source-agnostic newspaper composition for Overview and Day while preserving semantic precision, exact links, runtime fallback, and Golden Viewer boundaries.

## Impact

- Affects React composition and styling in `src/app`, `src/features/import`, `src/features/review`, `src/features/result`, `src/features/golden`, `src/index.css`, and the MUI theme in `src/app/tripTheme.ts`.
- Affects component and browser visual/interaction tests plus benchmark regression verification; it does not change parser schemas, CanonicalTrip, persistence formats, Gemini credential handling, or provider contracts.
- Uses the existing React 19, MUI, and Tailwind stack; no new UI framework or parallel handcrafted component system is introduced.
- Does not enable PDF input, Spreadsheet intake, a local parser fallback, generalized Today, or Hosted Delivery.
