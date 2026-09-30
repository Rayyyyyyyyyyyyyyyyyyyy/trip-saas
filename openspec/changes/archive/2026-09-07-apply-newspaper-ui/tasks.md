## 1. Baseline and requirement coverage

- [x] 1.1 Add a requirement-to-test/task traceability table for both delta specs, including every workflow surface, generalized Result state, Golden boundary, accessibility check, exact-link check, runtime fallback, and benchmark guardrail.
- [x] 1.2 Characterize the existing Home/intake/progress, Review/insufficient recovery, confirmation/failure, generalized Overview/Day, and Golden mobile/desktop flows before changing their composition; record any behavior discrepancy separately from the visual migration.
- [x] 1.3 Add failing unit tests for the frozen light-only token values, removal of the dark token branch, rectangular MUI defaults, typography roles, 44px mobile interactive defaults, and Tailwind/MUI styling-ownership rules.
- [x] 1.4 Add failing component/browser assertions that reject rounded card/elevation/large semantic-fill treatments on migrated primary surfaces without coupling tests to incidental DOM structure.

## 2. Newspaper foundation

- [x] 2.1 Replace `tripVisualTokens` and the MUI theme with the exact paper, sunk, ink, muted, faint, hairline, anchor, readiness/flexible, alternative, tentative/attention, and movement/supporting roles from `spec/06_RESULT_UI_SPEC.md`.
- [x] 2.2 Remove the production dark visual branch and rounded component defaults while preserving visible focus, MUI interaction behavior, destructive confirmation clarity, and minimum mobile targets.
- [x] 2.3 Map the frozen roles and editorial serif, utility sans, and source monospace stacks through `src/index.css` and Tailwind project tokens without declaring the same property in both `className` and `sx`.
- [x] 2.4 Bundle or locally serve licensed Noto Serif TC and Noto Sans TC webfont assets with documented fallbacks and verify that blocked font loading leaves all itinerary content and controls readable without a third-party runtime request.
- [x] 2.5 Implement only the shared editorial presentation seams justified by at least two surfaces: reading sheet/measure, section heading plus hairline, 4px semantic marker, rectangular action treatment, and bordered evidence/reference frame.
- [x] 2.6 Run the theme, styling-ownership, shared-primitive, typecheck, and production-build checks before migrating feature surfaces.

## 3. Home, intake, progress, and settings

- [x] 3.1 Extend Home component tests for newspaper hierarchy, rectangular upload/paste controls, long content wrapping, active-trip summary, visibly reachable secondary controls, and preserved clean-start/sample behavior.
- [x] 3.2 Recompose Home and its active-trip/reserved-optional sections as one editorial reading sheet using type, whitespace, hairlines, and rectangular actions instead of rounded cards or tinted panels.
- [x] 3.3 Recompose Markdown file/paste intake, character count, empty validation, clear/replace actions, privacy/format guidance, and grouped progress with the shared grammar while keeping Markdown enabled, Spreadsheet gated, and PDF unsupported.
- [x] 3.4 Recompose Gemini credential, Canonical JSON import, local-data clearing, and sample/settings surfaces without changing persistent credential storage, clear-operation scope, Canonical import availability, or privacy wording.
- [x] 3.5 Add mobile/desktop browser coverage for Home/intake/progress keyboard order, visible focus, at least 44px mobile targets, no horizontal overflow, no console errors, active-trip preservation on failure, and no prototype-only parser/format behavior.

## 4. Review, recovery, confirmation, and failure

- [x] 4.1 Extend Review component tests for the editorial evidence-first order, monospace source excerpts, `你的校正` provenance, independent optional/tentative/flexible flags, rectangular correction controls, material findings, and long excerpt wrapping.
- [x] 4.2 Recompose Review as the same centered single-column editorial flow on mobile and desktop while retaining every existing correction, add/delete/revert, evidence, finding, validation, cancellation, and confirmation action.
- [x] 4.3 Replace rounded/tinted finding and source containers with hairlines, bordered evidence frames, readable severity text, and restrained 4px markers that never communicate state by color alone.
- [x] 4.4 Recompose insufficient-result recovery, provider/validation/persistence failures, and return/retry/replace actions using the shared failure grammar without allowing normal Review or replacing the active trip.
- [x] 4.5 Recompose confirmation-in-progress and success surfaces with black primary and rectangular secondary actions while preserving authoritative pre-persist validation, transactional activation, candidate clearing, and one consistent active-trip identity.
- [x] 4.6 Run Review workflow component/browser tests at mobile and desktop widths for action parity, logical keyboard focus, 44px mobile targets, cancellation versus surface close, failed confirmation recovery, active-trip preservation, overflow, and console cleanliness.

## 5. Generalized Overview and Day

- [x] 5.1 Add or update Result component tests for the continuous Overview reading order, omitted absent sections, approximately 680px desktop measure, hairline-separated readiness/anchors, and day-index navigation through Presentation Projection only.
- [x] 5.2 Recompose generalized Overview into a white-paper editorial document for identity, dates/geography, journey, conditional readiness, critical anchors, flights/stay when present, and the day index without KPI, card-grid, or fake-placeholder treatment.
- [x] 5.3 Add or update Result tests for Day identity, fixed-anchor omission, same-line supported time/title treatment, intentionally untimed content, optional/free-time hierarchy, alternatives/conditions/fallbacks, transit, readiness, unresolved places, and supporting context.
- [x] 5.4 Recompose Day entities, relationship groups, transit connectors, readiness labels, optional disclosure, and supporting references with hairlines, whitespace, bordered evidence frames, and approved 4px semantic markers without changing Presentation Projection or CanonicalTrip.
- [x] 5.5 Rebuild the mobile horizontal and desktop persistent Date Rails as rectangular controls with black/white active state, white/hairline inactive state, visible focus, touch/keyboard overflow operation, active-date visibility, and reorientation to Day identity/start.
- [x] 5.6 Implement the mobile single-column and desktop coordinated navigation/timeline/supporting regions while keeping the primary timeline at approximately 680px and preserving equivalent semantics/actions between widths.
- [x] 5.7 Verify every rendered external map/restaurant/supporting action still uses the exact confirmed URL, new-tab target, and safe `rel`, and verify unresolved or absent links never generate a guessed action.
- [x] 5.8 Run generalized Result component/browser semantic stress coverage for all time modes, missing anchors/sections, optional/free-time-heavy days, relationships, readiness, unresolved content, runtime-unavailable fallback, long text, overflow, keyboard behavior, light-mode contrast, and console cleanliness.

## 6. Golden Viewer compatibility

- [x] 6.1 Add failing Golden visual-characterization checks for shared newspaper tokens/grammar while retaining explicit sample entry and isolation of Golden-only Today, Reservations, checklist, NOW/NEXT, and leave-by capabilities.
- [x] 6.2 Migrate Golden Overview, Day, Date Rail, and semantically equivalent event/supporting treatments to the shared editorial seams without routing Golden-only behavior into generalized Result ownership.
- [x] 6.3 Migrate Golden Today and Reservations/checklist surfaces to the newspaper grammar while preserving Asia/Tokyo transitions, pre-trip/no-fake-NOW behavior, post-trip access, checklist/reservation synchronization, trip-scoped persistence, and the USJ unconfirmed default.
- [x] 6.4 Re-run byte-for-byte exact Google Maps/Tabelog URL checks, safe external-link behavior, pre-/during-/post-trip runtime characterization, runtime-failure static fallback, explicit sample behavior, and checklist reload compatibility.
- [x] 6.5 Complete Golden mobile/desktop browser QA for 44px controls, keyboard navigation, active Date Rail visibility, no horizontal overflow, light-mode contrast, long itinerary content, and no console errors.

## 7. Final validation and scope audit

- [x] 7.1 Run all unit and component tests, the full Playwright suite at required mobile and normal desktop viewports, `npm run build`, and `git diff --check`; fix only regressions within this change's scope.
- [x] 7.2 Perform visual QA against the September 2026 mobile/desktop references for every migrated state and record any accessibility-driven token exception explicitly rather than silently substituting a new visual system.
- [x] 7.3 Re-run the deterministic External Markdown Benchmark #001 fixtures and the evidence-backed Review → corrected CanonicalTrip → generalized Overview/Day path, confirming that the visual migration preserves annotated ambiguities, findings, semantic distinctions, and renderability.
- [x] 7.4 Record that this change does not satisfy or bypass the still-pending live parser-quality gate in `build-trip-runtime-v0` and does not unlock Hosted Delivery until that independent gate passes.
- [x] 7.5 Inspect the final diff to confirm no raw source/provider/Review data entered Result rendering or durable storage and no PDF/Spreadsheet input, local parser fallback, credential-policy change, Canonical JSON export, generalized Today, provider registry, or Hosted Delivery implementation was introduced.
- [x] 7.6 Verify no file under `temp/Mobile app and web design/` was modified, run `openspec validate apply-newspaper-ui --strict`, and update current `spec/` documents only if implementation evidence changed a normative decision.
