# Handoff — add-spreadsheet-intake-and-result-clarity

Updated 2026-10-01. This change is paused at the user's request after task group 2. **Nothing is committed yet.**

## Where things stand

| Group | Tasks | State |
|---|---|---|
| 1. Result clarity | 1.1–1.5 | Done; Codex review clean (`NO_ISSUES` on round 5) |
| 2. Supporting groups + Canonical v3 | 2.1–2.5 | Implemented and tests green; **Codex review not run yet** |
| 3. Range-compressed coverage | 3.1–3.4 | Not started; 3.4 needs user authorization for a live Gemini run |
| 4. Spreadsheet Source Adapter | 4.1–4.8 | Not started; 4.1 (add SheetJS) needs user approval |
| 5. Intake UI and Review | 5.1–5.6 | Not started; 5.2 builds on `complete-faithful-markdown-journey` task 4.10 (still open) |
| 6. Acceptance and docs | 6.1–6.5 | Not started; 6.2 needs user authorization for live Gemini runs |

Progress is 10/33 (the tasks.md checkboxes are authoritative).

## Git state

- Branch `main` at `58dace3`, which equals `origin/main`, the only remote branch and the GitHub default. Its history contains no third-party samples, and `temp/Odata/*` is git-ignored except `00 我/`.
- All work for this change is uncommitted on `main` (47 paths). Per the repo convention, move it to a feature branch before committing (for example `git switch -c ft/spreadsheet-intake`). Commit or push only when the user asks.
- `src/features/result-clarity-prototype/` is a throwaway prototype (Result variants A/B/C on Sample #23). Per the prototype workflow, capture it on a throwaway branch, keep it out of the feature commit, and delete it from the working tree afterwards. The chosen design was **A, plus B's 44px map button**.

## Evidence for the current working tree (2026-09-30)

- `npm run typecheck` and `npm run build` pass. Build output has only the existing chunk-size warning.
- Unit: 344 tests pass. Component: 82 tests pass.
- Playwright, desktop-chromium and mobile-chromium:
  - specs run: `generalized-result`, `golden-data`, `golden-smoke`, `golden-runtime`, `captured-benchmark-review`, `review-workflow`, `newspaper-visual-system`
  - result: 47 passed, 1 skipped (the skip is pre-existing)
- Playwright platform-chrome and platform-webkit (storage/credential): 18 passed.
- The full Playwright suite (all specs) has not been run on this tree.

## What changed

**Group 1**:
- `createTripPresentation` now projects `mapAction` (source URL first; otherwise a labeled Google Maps search built from the verbatim place text), `placeLine` (omitted when the title already contains the place), `stateLabel` (at most one; none for choose-one members), and `unrenderedSupportingIds`.
- The map label and accessible name come from the projection.
- `mapSearchHref` is shared with Golden.
- `ResultEntity` uses an MUI `Button component="a"` of at least 44px.
- The optional Accordion in `ResultDay` has summary/region ARIA wiring.
- Golden keeps its accessible names `開啟地圖` and the optional entity title.

**Group 2**:
- `SupportingGroup` added, with the `canonical-trip.v3` schema and generated validators.
- v2 decodes to v3 with `group: null`; v1 still decodes.
- `deriveSupportingGroups` (domain, pure) runs after the response gates, using the Markdown nearest heading or the spreadsheet sheet.
- Review shows the group label read-only.
- Result renders groups as default-collapsed MUI Accordions titled `label（count）`.

The authoritative details are in `design.md`, under "Implementation clarifications".

## Spec adjustments made during work

- The place de-duplication rule is "title **contains** place", not equality. Real Seoul data required it; this is updated in `specs/trip-result-ui/spec.md`.
- The `trip-result-ui` delta reverses the main spec's "no guessed map query" rule. It allows a search action that is labeled as a search and built only from the verbatim place text.

## Working agreement (from the user)

- **Codex writes the code and Codex reviews it.** Claude orchestrates:
  - hand Codex the spec context
  - run the Playwright tests (Codex's sandbox cannot bind a dev server)
  - relay results
- Run Codex with `-m gpt-5.6-sol`, because the default model errors on this ChatGPT account:
  - implement: `codex exec -m gpt-5.6-sol -s workspace-write -C . -`
  - review: `codex exec -m gpt-5.6-sol -s read-only -C . -`
- Review scope is spec/design conformance and real defects only. Low-severity findings are recorded, not looped. **At most 2 review rounds per group**, then report to the user.
- Fix ambiguous details (names, shared components, Golden compatibility) in design.md *before* handing a group to Codex. Group 1 took 5 review rounds because they were not fixed up front.
- Give Codex smaller slices (1–2 tasks per run). Whole-group runs took about 30 minutes each.
- Don't make the user choose between UI variants. Make the design call with a one-line reason and let them veto.
- Don't raise privacy procedures about the `temp/Odata` samples. They stay local and benchmarks read them in place.

## Next steps

1. Run the group 2 Codex review (≤2 rounds), then fix high/medium findings only.
2. Group 3: implement 3.1–3.3 through Codex. Ask the user before 3.4 (rerunning live External Markdown Benchmark #001 on the new response schema version).
3. Ask the user to approve adding SheetJS CE pinned from the official distribution (not `xlsx@0.18.x` from npm) before group 4.
4. Check the status of `complete-faithful-markdown-journey` task 4.10 before 5.2.
5. Before committing: create a feature branch, capture the prototype on a throwaway branch, and run the full test suite.
