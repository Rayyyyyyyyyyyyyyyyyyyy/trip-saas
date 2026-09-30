# Apply Newspaper UI — Validation Record

Validated on 2026-09-03 against the September 2026 mobile and desktop
references under `temp/Mobile app and web design/`.

## Executable evidence

| Boundary | Command | Result |
| --- | --- | --- |
| Unit and component regression | `npm test` | 42 files, 204 tests passed |
| Full supported browser matrix | `npm run test:browser` | 43 passed, 1 intentional desktop skip for the mobile-only 44px audit |
| Visual-system ownership | `npx playwright test tests/browser/newspaper-visual-system.spec.ts --project=mobile-chromium --project=desktop-chromium` | 2 passed; light-only paper, local fonts, 30px/44px responsive title, rectangular/no-shadow paper, ink checked controls, no console errors |
| Deterministic benchmark guardrail | `npm run test:unit -- tests/unit/external-markdown-benchmark.test.ts tests/unit/external-markdown-live-comparison.test.ts tests/unit/result-renderer-boundary.test.ts` | 3 files, 8 tests passed |
| Review → corrected CanonicalTrip → Result evidence | `npm run test:component -- tests/component/review-screen.test.tsx tests/component/result-viewer.test.tsx tests/component/golden-surfaces.test.tsx` | 3 files, 14 tests passed |
| Production build | `npm run build` | typecheck passed; Vite build passed with only the existing advisory for a JavaScript chunk over 500 kB |
| Patch hygiene | `git diff --check` | passed |

## Visual QA matrix

The visual comparison used the desktop reference directly and the repository's
mobile/desktop Playwright projects. Browser inspection covered the current Home,
Golden Overview, Golden Day, Today, and Reservations screens; the remaining
workflow states were exercised as rendered browser states by the named tests.

| Migrated state | Visual evidence | Outcome |
| --- | --- | --- |
| Home, file/paste intake, settings | Manual desktop browser inspection; `test-harness.spec.ts`; `newspaper-visual-system.spec.ts` at both viewports | Editorial hierarchy, rectangular controls, local serif/sans roles, focus/44px/overflow and light-only behavior match the shared grammar |
| Intake progress and guidance | `test-harness.spec.ts` at both viewports | Progress truthfulness, Spreadsheet gate, PDF unsupported copy, and separate clear scopes remain visible without cards or semantic fills |
| Review, evidence, findings | `review-workflow.spec.ts` at both viewports; Review component characterization | Single 680px evidence-first column, monospace excerpts, 4px markers, hairlines, correction provenance, focus and action parity pass |
| Insufficient recovery and failures | Insufficient/failure component characterization and full workflow suite | Same paper/hairline failure grammar; active-trip preservation and retry/return actions pass |
| Confirmation | `review-workflow.spec.ts` plus workflow component tests | Rectangular success region/actions and transactional activation pass |
| Generalized Overview and Day | `generalized-result.spec.ts` at both viewports; Result component semantic stress tests | Source-agnostic continuous Overview, omitted absent sections, coordinated Day rail/timeline, exact actions, semantic states and 680px measure pass |
| Golden Overview and Day | Manual desktop browser inspection; Golden component/browser suites | Golden-only ownership stays separate while the common rail, editorial measure, markers and supporting regions match the reference grammar |
| Golden Today and Reservations | Manual desktop browser inspection; Golden runtime/data/smoke browser suites | Countdown/no-fake-NOW, static fallback, checklist sync/reload, USJ pending default and exact links pass |

No accessibility-driven token exception was required. A manual check exposed
that unlayered MUI typography could override Tailwind utilities; the composition
root now enables MUI's `mui` cascade layer and declares it below Tailwind
utilities. The focused browser regression proves the intended 30px mobile and
44px desktop Home title sizes. A follow-up computed-style assertion confirms
checked controls resolve to the frozen ink role (`#121212`).

## Benchmark and release gate

The deterministic External Markdown Benchmark #001 fixtures and the
evidence-backed Review/Result seams remain green. This is a rendering migration,
not new parser-quality evidence. The live Gemini parser-quality gate owned by
`build-trip-runtime-v0` remains pending and this change neither satisfies nor
bypasses it. Hosted Delivery therefore remains locked until that independent
gate passes.

## Scope audit

- No files under `src/domain/`, `src/persistence/`, `src/integrations/`, the
  Markdown adapter, or `src/tripData.ts` changed.
- Result code still consumes Presentation Projection only; the renderer-boundary
  test rejects source, Review, provider, and Canonical/domain imports.
- Browser storage inspection still rejects raw source, Review, provider response,
  and credential plaintext persistence.
- No PDF input, Spreadsheet input, local parser fallback, credential-policy
  change, Canonical JSON export, generalized Today, provider registry, hosted
  snapshot/publication, or Hosted Delivery implementation was added.
- Existing exact Google Maps/Tabelog URLs, safe target/rel attributes, Tokyo
  runtime states, runtime failure fallback, active-trip replacement semantics,
  and checklist compatibility remain covered by the full suite.
- No content file under `temp/Mobile app and web design/` was edited. The
  directory remains a pre-existing, unrelated untracked reference directory.

## Coding-architecture audit

The migration followed Reuse → Compose → Extract → Abstract. Existing MUI
interaction behavior, feature state owners, Presentation Projection, Golden
runtime selectors, persistence repositories, and workflow orchestration were
reused; screens were recomposed locally before the following shared presentation
seams were extracted.

| Shared seam | Concrete consumers | Why an existing contract was insufficient |
| --- | --- | --- |
| `EditorialMeasure` | Home, Review, insufficient recovery, confirmation success, Golden Day, Golden Viewer | MUI supplies interaction primitives and Tailwind supplies values, but neither expresses the approved cross-surface 680px reading measure |
| `EditorialSectionHeading` | Home, Review, Review findings, Result Overview, Golden Reservations | Repeated editorial heading + hairline semantics were shared by multiple independently owned feature surfaces |
| `EditorialMarker` | Home/intake/settings, Review/recovery/findings, Result Overview/Day, Golden Today | The 4px semantic edge plus transparent body is product grammar, not feature state and not a generic alert implementation |
| `EditorialFrame` | Review source excerpts, Result Day supporting context, Golden Today | The bordered evidence/reference frame recurs across source evidence and supporting runtime context without taking ownership of their data |

The existing exported `tripVisualTokens`, `tripTypography`, and MUI theme remain
the token/theme seam; they were replaced in place rather than wrapped. The
composition-root `StyledEngineProvider` is framework integration configuration,
not another component abstraction. Every shared editorial export has at least
two concrete consumers, carries presentation only, and owns no workflow,
Canonical, projection, runtime, or persistence state. Zero-consumer legacy token
aliases were removed. There are no `utils`, `common`, speculative registries, or
second handcrafted component systems, and no intentional architecture deviation.
