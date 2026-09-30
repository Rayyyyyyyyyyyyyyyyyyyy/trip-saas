## Context

`build-trip-runtime-v0` established the working V0 architecture, workflow, persistence, Review, generalized Result UI, and Golden fallback. Its current UI implementation still uses the superseded rounded, elevated, teal/orange light-and-dark system in `src/app/tripTheme.ts`, `src/index.css`, and feature components. The September 2026 mobile/desktop prototype has since been adopted into `spec/06_RESULT_UI_SPEC.md` as the durable visual authority: Chinese editorial typography, white paper, black ink, hairlines, rectangular controls, restrained 4px semantic markers, and a light-only contract.

This change is deliberately a presentation migration. CanonicalTrip remains the confirmed truth, Presentation Projection remains the only Result input, the workflow reducer continues to own candidate/active-trip transitions, and Golden-only runtime capabilities remain isolated. The prototype is visual evidence, not authority for input formats, provider behavior, credential storage, persistence, navigation scope, or Hosted Delivery.

## Goals / Non-Goals

**Goals:**

- Apply one coherent newspaper visual grammar to Home/intake, progress, Review, confirmation, recoverable failure, generalized Overview/Day, and compatible Golden surfaces.
- Centralize the frozen colors, font roles, hairlines, shape, focus, and control metrics so MUI behavior and Tailwind composition use the same source of truth.
- Preserve the semantic hierarchy of exact/approximate/open-ended/untimed events, fixed anchors, flexible/optional content, alternatives, readiness, transit, unresolved content, and exact actions.
- Keep mobile primary, retain at least 44px mobile interaction targets, and use wider screens for coordinated context without stretching the primary reading column beyond approximately 680px or becoming a dashboard.
- Revalidate workflow and Result surfaces at mobile and desktop widths, including keyboard/focus behavior, overflow, active Date Rail visibility, light-mode contrast, console cleanliness, runtime degradation, Golden behavior, and benchmark fixtures.

**Non-Goals:**

- Changing CanonicalTrip, ParsedTripDraft, Presentation Projection semantics, workflow state transitions, persistence schemas, or exact source-provided URLs.
- Adding PDF or Spreadsheet input, a local semantic parser fallback, a provider registry, Canonical JSON export, generalized Today/NOW/NEXT/leave-by, or Hosted Delivery.
- Replacing persistent browser-local Gemini credential behavior or weakening privacy/storage exclusions.
- Copying prototype-only screen switching, session-only key behavior, source-format claims, or dark theme into production.
- Modifying files under `temp/Mobile app and web design/`.

## Decisions

### 1. Replace the theme atomically with one light-paper token source

`tripVisualTokens`, MUI theme construction, and Tailwind CSS variables will expose the frozen roles from `spec/06_RESULT_UI_SPEC.md`: paper `#ffffff`, sunk utility `#f5f4f1`, ink `#121212`, muted/faint text, hairline, and the five restrained semantic accents. Global MUI shape becomes rectangular, while interactive primitives retain accessible focus and minimum target behavior. Static layout and visual styling remain in Tailwind/project classes; `sx` remains limited to MUI internals, theme-aware states, or genuinely dynamic values, with no duplicate property ownership.

The production app will expose no dark-mode branch or dark acceptance path. The theme factory may keep only the API shape required by callers during migration, but it must not silently retain a second visual contract.

Alternative considered: layer newspaper overrides on top of the existing light/dark theme. Rejected because it leaves two competing token systems, retains rounded defaults, and makes regressions dependent on CSS injection order.

### 2. Deliver the approved type roles without a runtime network dependency

The application will use `Noto Serif TC` for trip/day identity, event titles, and reading copy; `Noto Sans TC` for time, metadata, labels, buttons, and controls; and `ui-monospace`/Menlo for source excerpts. Required webfont assets will be bundled or otherwise served with the application under their compatible license, with the documented Georgia/Times/system fallbacks. The travel viewer must remain legible when fonts fail, and font loading must not block static itinerary access.

Alternative considered: import Google Fonts at runtime as the prototype does. Rejected because the real travel viewer must degrade safely when connectivity or third-party font delivery is unavailable.

### 3. Build a small editorial presentation vocabulary, not another component system

The migration will introduce only reusable presentation seams justified across multiple surfaces: editorial reading sheet/measure, section heading and hairline, semantic 4px marker, rectangular primary/secondary action treatment, bordered evidence/reference frame, and Date Rail treatment. MUI continues to provide accessible buttons, fields, accordions/disclosures, alerts, dialogs, and checkbox behavior. Existing feature components remain the owners of workflow and domain-specific composition.

Alternative considered: restyle every feature independently from screenshots. Rejected because duplicated magic values would drift and recreate a parallel handcrafted system. A large generic design-system package is also rejected because this repo needs a narrow project vocabulary, not a framework.

### 4. Migrate workflow surfaces without changing their state contracts

Home/intake, grouped progress, Review, insufficient/recoverable failure, and confirmation success will be recomposed using the shared editorial grammar while retaining existing actions, privacy copy, candidate isolation, source evidence, correction parity, authoritative validation, and transactional activation behavior. Review remains a centered single-column evidence-first flow on both widths. User overrides keep the `你的校正` provenance treatment and independent optional/tentative/flexible controls.

Failure surfaces will use text, hairlines, restrained needs-attention markers, and rectangular actions; they will not become large colored alert cards. Closing a surface remains distinct from cancelling a parse, and any active confirmed trip remains readable.

Alternative considered: adopt every workflow and intake behavior shown by the prototype. Rejected because prototype PDF/Spreadsheet claims, local fallback parsing, and session-only credentials conflict with the approved V0 contracts.

### 5. Preserve the Result boundary while changing composition

Generalized `ResultOverview` and `ResultDay` continue to consume only `TripPresentation`. Overview becomes one continuous editorial document with trip identity, dates/geography, journey, conditional readiness, critical anchors, and a navigable day index; missing facts remain omitted. Day retains semantic order, presents time immediately before the title where supported, keeps optional content outside the committed hierarchy, renders transit as connective tissue, and moves supporting context between nested mobile and coordinated desktop regions without changing meaning.

The primary desktop reading measure is capped at approximately 680px. Mobile uses a horizontal rectangular Date Rail; desktop uses persistent rectangular day navigation and secondary supporting context. The active day uses black fill with white text, and selection always reorients focus/scroll to the Day identity while keeping the active item visible.

Alternative considered: preserve the current two-column Overview and card grid while changing colors. Rejected because the approved direction changes hierarchy and reading measure, not merely decoration.

### 6. Share grammar with Golden surfaces while keeping Golden capability ownership

Golden Overview and Day will use the same editorial vocabulary wherever their semantics match generalized Result UI. Golden Today, Reservations, checklist synchronization, Tokyo-time logic, and explicit sample entry remain under `src/features/golden`; the migration may restyle them but must not expose those capabilities in generalized V0. Exact map/Tabelog URLs and the USJ unconfirmed default remain characterization-tested.

Alternative considered: route Golden-only Today and readiness behavior through generalized Result components. Rejected because visual reuse must not collapse product scope or runtime ownership boundaries.

### 7. Verify behavior first and visual acceptance at explicit widths

Existing component/browser tests will be updated or extended before each surface migration to characterize action availability, state transitions, semantic markers/labels, focus order, and exact links without snapshotting incidental DOM. Playwright checks will cover the required mobile and normal desktop viewports, horizontal overflow, at least 44px mobile controls, keyboard operation, active Date Rail visibility, console errors, and light-mode contrast. Semantic fixtures will cover missing anchors/sections, all time modes, optional/free-time-heavy days, alternatives, readiness, unresolved places, and runtime-unavailable fallback.

The deterministic External Markdown Benchmark #001 fixtures and Review-to-Canonical-to-Result path will be rerun as regression guardrails. This visual change does not claim the still-pending live parser-quality acceptance gate or unlock Hosted Delivery.

Alternative considered: approve by visual comparison with prototype screenshots alone. Rejected because screenshot resemblance cannot prove semantic integrity, interaction parity, runtime fallback, or benchmark preservation.

## Risks / Trade-offs

- [Bundled Traditional Chinese fonts increase payload size] → Subset/optimize licensed WOFF2 assets where feasible, preload only essential faces, keep fallback stacks, and verify that font failure leaves the itinerary usable.
- [A global zero-radius MUI theme can make dense controls harder to distinguish] → Retain hairline frames, spacing, labels, focus rings, and 44px mobile targets; validate fields, dialogs, disclosures, and destructive confirmations individually.
- [Removing colored surfaces can weaken semantic scanning] → Use the frozen 4px marker and restrained label/accent roles consistently, then test the semantic stress fixture and contrast rather than reintroducing large fills.
- [Cross-cutting restyling can accidentally change workflow behavior] → Characterize each workflow state before migration and keep reducer/selectors, persistence, parser, and confirmation services out of the styling patch unless a narrowly demonstrated accessibility seam requires change.
- [Golden and generalized components can visually drift] → Share only the small editorial primitives/tokens, then run both generalized and Golden browser flows; do not force semantic owners into one component.
- [Prototype mechanics may fail on real content lengths] → Treat sticky offsets and overflow mechanics as implementation-tunable, test long titles/source excerpts/dense dates, and prefer readable degradation over matching prototype coordinates.
- [The base V0 change still has pending live benchmark tasks] → Record validation separately; this change may prove no UI regression but cannot mark the parser gate or Hosted Delivery gate complete.

## Migration Plan

1. Add or update regression tests for the frozen tokens, light-only theme, styling ownership, typography roles, and shared editorial primitives.
2. Replace the global theme/CSS variables and font delivery, then verify build, focus, and fallback before migrating screens.
3. Migrate Home/intake/progress and secondary settings without changing supported formats, privacy, or credential behavior.
4. Migrate Review, insufficient/failure, and confirmation surfaces while preserving evidence, corrections, cancellation, validation, and activation behavior.
5. Migrate generalized Overview/Day, Date Rail, semantic entities, relationships, readiness, and supporting context through Presentation Projection only.
6. Migrate compatible Golden surfaces and re-run Tokyo-time, checklist/reservation, exact-link, sample-entry, and runtime-fallback characterization.
7. Run component/browser semantic stress checks, mobile/desktop visual QA, benchmark regression checks, production build, diff hygiene, and a final scope audit.

Rollback is a normal source revert of this focused change. No persisted data or schema migration is introduced, so rollback must retain active trips, checklist state, and credentials. Font assets added solely by this change may be removed with the visual implementation if rollback is required.

## Open Questions

No product-scope questions block implementation. Exact sticky offsets, scroll animation, responsive type metrics, and font subsetting are implementation-tunable within the frozen visual tokens, 680px reading measure, accessibility checks, and runtime fallback requirements.
