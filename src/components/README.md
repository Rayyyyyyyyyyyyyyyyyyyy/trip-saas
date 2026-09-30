# Shared components ownership

Own the cross-feature presentation primitives that carry a frozen design
decision. A primitive belongs here only when more than one feature must render
it identically; anything that encodes workflow or itinerary meaning stays in
its owning feature.

## Current contents

- `editorial/EditorialPrimitives.tsx` owns the shared reading measure, the
  section heading and hairline, the 4px semantic marker, and the evidence /
  reference frame.

## Editorial primitive boundary

- `editorialMeasureClass` is the single definition of the ~680px primary
  reading measure. Surfaces that need their own element or landmark compose
  this class; they must not restate `max-w-[680px]`.
- `editorialMarkerClass(tone, className, { nested })` is the single definition
  of the 4px semantic marker, including its two insets. `EditorialMarker` is
  the component form and `EditorialFrame`'s `markerTone` prop is the framed
  form; all three compose the same tone map, so `border-l-4` never appears
  outside this module.
- The rectangular action treatment named alongside these seams is owned by
  `src/app/tripTheme.ts` (`shape.borderRadius: 0` plus the MUI component
  overrides), not by this module. MUI owns component behavior per
  `src/app/README.md`, so the treatment belongs to the theme.
- Marker tones are semantic (`anchor`, `attention`, `movement`, `alternative`,
  `ready`, `neutral`), never color names. Features map their own state to a
  tone; they do not pick a border color.
