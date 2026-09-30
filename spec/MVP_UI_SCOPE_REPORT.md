# Trip Runtime — MVP Scope Boundary

> Status: Current Scope Decision  
> Purpose: Prevent Golden Viewer capability, Generalized Product V0, and future runtime features from collapsing into one scope.

## 1. Scope problem

Trip Runtime has:
- a real Golden Viewer with runtime-oriented features
- a generalized Markdown product pipeline still under validation

These are related but not identical.

## 2. Generalized Product V0

Goal:

> Prove unfamiliar Markdown can become a confirmed, useful mobile Result without requiring the traveler to rebuild the itinerary.

Required surfaces:

```text
Home / Upload
→ Review
→ Overview
→ Day
```

Required system capabilities:
- Markdown file or pasted Markdown text intake through one Markdown Source Adapter
- one required normalized text-input schema for both intake modes
- one executable, validated source-document schema with source-neutral evidence-unit identity
- semantic parsing
- one provider-neutral required interpretation-response schema
- complete evidence-unit accounting with explicit unparsed-item reporting
- deterministic validation
- user correction
- CanonicalTrip confirmation
- local persistence
- canonical JSON import
- source-agnostic Overview/Day rendering
- one non-overlapping Day display tree with complete relationship-member presentation
- bounded processing modal with application deadline and explicit stop recovery

V0 ends at a locally confirmed and renderable trip.

## 3. Golden Viewer

Golden Viewer is the real Osaka/Uji/Nara travel site.

It may continue to include:
- Overview
- Today
- Day
- reservations
- checklist
- directions
- NOW/NEXT prototypes
- source-derived leave-by behavior

These are compatibility and real-use requirements for Golden Result #001.

Compatibility applies only to behavior present in the current checked-in viewer; no discarded-branch implementation baseline is inherited.

They do not automatically expand generalized V0 scope.

Design/prototype artifacts may show Generalized V0 and Golden Viewer states together for review. In the Generalized V0 product:
- production navigation exposes only supported V0 destinations
- Today/runtime destinations remain hidden when the capability is unavailable
- one active confirmed trip plus one candidate import state does not become a persisted multi-trip library

## 4. V0.1 — Hosted Delivery Lite

Hosted publication is a separate capability.

```text
Confirmed CanonicalTrip
→ viewer-safe snapshot
→ unlisted hosted URL
```

Implementation is blocked until External Markdown Benchmark #001 passes.

## 5. Deferred generalized capabilities

Not required for V0 acceptance:
- Today runtime generalization
- Map View
- Reservations hub
- place resolution
- weather
- flight status
- live transit
- current location
- account system
- collaboration
- recommendation
- replanning

## 6. Source-provided data rule

V0 may display source-provided:
- URL
- address
- booking reference
- reservation note
- phone
- website
- transit text
- deadline

V0 must not fabricate missing enrichment.

## 7. Result UI acceptance

The September 2026 mobile/desktop prototype supplies the approved newspaper
visual direction, not additional product scope. The durable visual contract is
`06_RESULT_UI_SPEC.md`: white paper, black ink, Chinese editorial hierarchy,
thin rules, rectangular controls, restrained semantic markers, no cards or
dark-mode contract, and an approximately 680px desktop reading measure.

Prototype screens showing PDF, Spreadsheet, local-only parsing, or Today do not
move those capabilities into Generalized V0. The roadmap and gates in this
document and `01_CANONICAL_CONTEXT.md` continue to control scope.

### Overview
Must compress trip structure better than the source Markdown.

### Day
Must be faster to scan during travel than the source Markdown.

Must preserve:
- time precision
- free time
- optional
- flexible
- notes
- source actions
- reservation state
- unresolved states
- explicit unparsed/missing source findings before confirmation

## 8. Runtime capacity rule

UI architecture may reserve capacity for future runtime features.

Example:

```text
V0:
14:00 Sushi
Reservation confirmed

Future:
14:00 Sushi
Reservation confirmed
Directions
Leave by 13:18
```

Rule:

> Design may reserve capacity. Product must not pretend the capability already exists.

Reserved capacity does not authorize inactive runtime destinations in Generalized V0 production navigation.

## 9. Out-of-scope behavior

Do not use V0 to validate:
- AI planning
- recommendation
- live data APIs
- full travel app IA
- advanced sharing
- universal source formats

## 10. V0 success

V0 succeeds when:

> An unfamiliar Markdown itinerary can be reliably understood, corrected, confirmed, and rendered as a mobile Overview + Day interface that is materially more useful during travel than the original Markdown.

## 11. Scope precedence

If this document conflicts with `01_CANONICAL_CONTEXT.md`, the Canonical Context wins.
