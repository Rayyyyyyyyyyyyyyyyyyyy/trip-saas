# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Authority order

`AGENTS.md` is the operating contract for this repository (scope gates, invariants, definition of done) — read it before non-trivial work. Behavioral authority for the product lives under `spec/`, indexed by `spec/00_README.md`. `CONTEXT.md` defines the ubiquitous language: use those exact terms (`UnifiedSourceDocument`, `ParsedTripDraft`, `Confirmed CanonicalTrip`, `Presentation Projection`, …) and avoid the listed aliases.

Each `src/*` directory has its own `README.md` stating that module's ownership boundary and its pending migrations. Those READMEs are the fastest way to learn a boundary and must be kept accurate when the boundary moves.

Work is tracked through OpenSpec: `openspec/changes/<change>/tasks.md` is the single progress list for an active change (currently `complete-faithful-markdown-journey`). Its `handoff.md` maps the full review and all predecessor open tasks. The three predecessor changes are archived as transferred, not fully accepted; the exact-model and Hosted Delivery gates remain pending. Use the `opsx:*` skills (`propose`, `apply`, `sync`, `archive`) rather than inventing a parallel process.

## Commands

```sh
npm run dev              # Vite dev server
npm run build            # typecheck + vite build (required before handing off code)
npm run typecheck        # tsc --noEmit

npm run test             # all vitest projects
npm run test:unit        # node env, tests/unit/**/*.test.ts
npm run test:component   # jsdom env, tests/component/**/*.test.tsx
npm run test:browser     # Playwright, tests/browser
```

Single test / single case:

```sh
npx vitest run --project unit tests/unit/trip-workflow-reducer.test.ts
npx vitest run --project component tests/component/home.test.tsx -t "accepts a Markdown file"
npx playwright test tests/browser/review-workflow.spec.ts --project=desktop-chromium
```

Live external benchmark (needs `GEMINI_API_KEY` injected by the environment, never committed or passed as a CLI argument):

```sh
npm run benchmark:external-markdown-001
```

Prettier is a devDependency with no script; format with `npx prettier --write <files>`. There is no ESLint.

## Test topology

- `tests/unit` — pure logic **plus architecture guards** that fail the build on boundary violations: `result-renderer-boundary.test.ts` (Result must not import `domain/trip`, `features/import`, `features/review`, `integrations/gemini`), `styling-ownership.test.ts` (no JSX element may carry both `className` and `sx`), `content-security-policy.test.ts` (validates `public/_headers`), `schema-contracts.test.ts`.
- `tests/browser` runs against **two dev servers** started by `playwright.config.ts`: port 4173 with `VITE_GEMINI_MODEL` set (Gemini intake available) and port 4174 with it empty (reproduces the production default where no model is pinned and intake is unavailable). Playwright's `baseURL` is the configured one; the unconfigured server is reached by absolute URL.
- Playwright projects: `desktop-chromium` / `mobile-chromium` for flows, `platform-chrome` / `platform-webkit` for storage, credential, and Web Crypto behavior (the spec lists are in `playwright.config.ts`).

## Architecture

The whole product is one browser-local pipeline; each arrow is an enforced boundary, not a suggestion:

```text
Source (Markdown file or paste)
→ TextSourceInput            features/import/textSourceInput.ts
→ Source Adapter (AST-based) features/import/markdownSourceAdapter.ts
→ UnifiedSourceDocument      (schema + integrity validated before any provider call)
→ ParseTrip port             app/parseTrip.ts  ← the only provider-neutral seam
→ Gemini adapter             integrations/gemini/geminiTripParser.ts
→ SemanticInterpretationResult / ParsedTripDraft
→ deterministic validation   domain/trip/validate*.ts
→ Review (evidence-backed)   features/review
→ Confirmed CanonicalTrip    persistence/confirmedTripRepository.ts (IndexedDB)
→ Presentation Projection    features/result/createTripPresentation.ts
→ Result UI                  features/result/Result*.tsx
```

Key consequences when editing:

- **`src/app/tripWorkflow.ts` is the sole owner** of active trip, the single in-memory candidate, session/request identity, status, findings, and failure. Features must not keep a second copy of workflow state; late async events from an inactive `sessionId`/`requestId` are rejected there.
- **Only `confirmation_committed`** — after the IndexedDB replacement transaction succeeds — moves a candidate into `activeTrip`. A failed import always leaves the previously confirmed trip readable.
- **Two separate failure vocabularies**, deliberately: `ParseTripFailureCode` (technical cause, in `app/parseTrip.ts`) is mapped exhaustively by `app/describeIntakeFailure.ts` onto the user-facing intake codes. Add to both ends, never leak a thrown provider message into the UI.
- **Provider containment**: Gemini types, envelopes, model identity, and request metadata never leave `src/integrations/gemini`. Credentials travel only in the `x-goog-api-key` header, never in a URL, and never into `CanonicalTrip` or persistence.
- **Renderer purity**: `features/result` consumes Presentation Projection only. Source-format branching must never reach Result components; a new input format adds a Source Adapter, not a Renderer path.
- **Persistence is three separately scoped stores** (`confirmedTripRepository`, `geminiCredentialRepository`, `checklistRepository`). Clearing trip data must not clear the credential, and vice versa; `localDataOperations` reports per-scope success because the stores cannot share one transaction. The credential is AES-GCM encrypted with a non-extractable `CryptoKey` — never fall back to plaintext `localStorage`.
- **Golden vs. generalized**: `src/features/golden` + `src/tripData.ts` are the real Osaka/Uji/Nara viewer (Golden Result #001, a traveler fallback). It reuses `tripNavigation` and the shared projection templates but keeps its own Today/checklist/reservations. Do not let generalized refactors regress it.

## Configuration gates

- `VITE_GEMINI_MODEL` (build-time) decides whether Gemini intake exists at all. Production is intentionally **unset**: exact `gemini-3.5-flash` is only the acceptance candidate until live External Markdown Benchmark #001 passes. Never pin a moving alias or add a silent fallback model.
- Hosted Delivery (Netlify) must not be implemented until that benchmark gate passes.
- All runtime date/time decisions use `Asia/Tokyo`. Never display a fabricated `NOW` or invent time precision the source does not support.

## Styling

Tailwind CSS 4 owns static layout, spacing, responsive composition, and visuals. MUI owns accessible component behavior; `sx` is only for MUI internal selectors, theme-aware states, or genuinely dynamic values. One element must have one styling owner per CSS property (enforced by `tests/unit/styling-ownership.test.ts`). `src/app/tripTheme.ts` is the single token source, projected to Tailwind via CSS variables in `src/index.css`; the newspaper light-paper palette is frozen by `spec/06_RESULT_UI_SPEC.md` and there is no dark palette. Shared editorial primitives (reading measure, hairline, 4px semantic marker, evidence frame) live in `src/components/editorial/EditorialPrimitives.tsx` and must not be restated inline.

## Repository hygiene

`spec/` holds current product contracts; `temp/` holds research evidence, fixtures, and the Golden itinerary source — keep that split. Update documents in place rather than creating versioned copies (`02_INPUT_RESEARCH_v0.7.md` and the like are forbidden). `.claude/`, `.codex/`, `.agents/`, and `.idea/` are out of product scope. Do not commit or push unless asked.
