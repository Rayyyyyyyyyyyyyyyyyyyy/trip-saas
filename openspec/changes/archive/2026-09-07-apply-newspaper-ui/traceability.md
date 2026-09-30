# Apply Newspaper UI — Implementation Traceability

## Requirement coverage

| Capability / requirement | Implementation owner | Public verification seam |
| --- | --- | --- |
| Newspaper · unified surface grammar | theme/CSS plus Home, Review, Result, Golden feature composition | Testing Library workflow/result components; Playwright Home→Review→Result and Golden flows |
| Newspaper · frozen light-paper roles | `src/app/tripTheme.ts`, `src/index.css` | exported `tripVisualTokens` / `tripTheme`; browser computed colors |
| Newspaper · offline editorial typography | local font assets plus global font roles | theme/CSS contract test; browser font-request and fallback readability checks |
| Newspaper · rectangular accessible controls | MUI component defaults plus feature composition | theme contract; Playwright keyboard, focus, 44px and overflow audits |
| Newspaper · semantic marker + text | Review, Result, Golden semantic blocks | Testing Library labels/structure; light-mode contrast and semantic stress flow |
| Newspaper · responsive editorial continuity | Home, Review, Overview/Day and Golden layouts | mobile/desktop Playwright viewports; long-content and overflow assertions |
| Newspaper · workflow/scope preservation | existing reducer/selectors and adapters remain owners | workflow component/browser tests; final diff scope audit |
| Result · Overview trip compression | `ResultOverview` from `TripPresentation` only | Result component reading-order/omission/navigation tests; desktop measure check |
| Result · Day semantic reading order | `ResultDay`, `ResultEntity`, relationship/supporting composition | Result component semantic stress tests at the React seam |
| Result · responsive parity | `ResultDateRail` and Day responsive regions | component active-date scroll test; mobile/desktop Playwright keyboard/overflow checks |
| Result · approved semantic visual system | shared theme tokens plus Result feature classes | exported theme tests, styling-ownership AST test, browser computed style/contrast |
| Result · Golden fallback | `src/features/golden` retains runtime/readiness ownership | Golden unit/component/browser characterization, exact-link and checklist persistence checks |
| Exact links | unchanged Presentation/Golden action contracts | Result component and Playwright href/target/rel assertions; Golden data tests |
| Runtime fallback | unchanged Golden runtime selectors and static render path | Golden runtime unit and browser checks |
| Benchmark guardrail | existing External Markdown Benchmark #001 fixtures and corrected Result path | deterministic benchmark tests; Review→CanonicalTrip→Result regression flow |

## Pre-migration characterization — 2026-09-03

- `npm run test:unit -- tests/unit/trip-theme.test.ts tests/unit/styling-ownership.test.ts tests/unit/result-renderer-boundary.test.ts tests/unit/golden-runtime.test.ts`: 4 files, 21 tests passed.
- `npm run test:component -- tests/component/home.test.tsx tests/component/review-screen.test.tsx tests/component/result-viewer.test.tsx tests/component/trip-runtime-workflow.test.tsx`: 4 files, 22 tests passed.
- First Playwright attempt used non-existent project names; corrected to repository projects.
- Sandboxed Playwright could not bind `127.0.0.1:4173`; the approved local-server rerun of `npx playwright test tests/browser/generalized-result.spec.ts tests/browser/review-workflow.spec.ts tests/browser/golden-smoke.spec.ts --project=mobile-chromium --project=desktop-chromium` passed 9 tests with 1 expected desktop skip.
- No pre-existing functional discrepancy was found in the characterized paths. The superseded light/dark rounded visual contract is the intentional migration delta.

## Acceptance boundary

This change can prove local visual and interaction migration plus deterministic benchmark non-regression. It does not complete the independent live Gemini parser-quality gate in `build-trip-runtime-v0` and cannot unlock Hosted Delivery.
