# Handoff — add-spreadsheet-intake-and-result-clarity

2026-10-12 cross-owner follow-up: the Markdown owner's tasks 4.9 and 4.11–4.13
are locally implemented and reviewed. Shared Review now uses source-linked
partial-date/raw-clock checks and memory-only correction/deletion authority;
explicit 12/24-hour context is respected. See
`../complete-faithful-markdown-journey/handoff.md` and its `validation.md` for
fresh checks and remaining acceptance gates. This does not pass spreadsheet
three-layout live acceptance or supported-format declaration. No fresh browser,
provider request, commit/push, main merge or deployment occurred in that slice.

Updated 2026-10-07. The user explicitly authorized adding SheetJS and continuing implementation. SheetJS CE 0.20.3 is installed from the official tarball; Group 4 is implemented and reviewed. Group 5 and the local benchmark runner are implemented and reviewed. The active owner’s prepared-source retry task 4.10 is also complete. Final verification is recorded in validation.md. The user reports `gemini-3.8-flash` rate limiting/instability and on 2026-10-07 explicitly chose to retain exact `gemini-3.5-flash`; live gates remain open with no key read or live call. The user authorized commit and push on 2026-10-07 for `ft/spreadsheet-intake`. This implementation, model-selection follow-up and validation record are included in that submission; earlier no-commit/no-push statements describe their original evidence time.

## Where things stand

| Group | Tasks | State |
|---|---|---|
| 1. Result clarity | 1.1–1.5 | Done; Codex review clean (`NO_ISSUES` on round 5) |
| 2. Supporting groups + Canonical v3 | 2.1–2.5 | Done; two-axis Codex review passed round 2 after one P2 fix |
| 3. Range-compressed coverage | 3.1–3.4 | 3.1–3.3 implemented and review passed round 1; 3.4 awaits live Gemini authorization |
| 4. Spreadsheet Source Adapter | 4.1–4.8 | 4.1–4.8 implemented; source-gate, date-preservation and whole-sheet reconciliation reviews passed |
| 5. Intake UI and Review | 5.1–5.6 | Implemented; both review axes passed round 1, shared task 4.10 verified |
| 6. Acceptance and docs | 6.1–6.5 | Local runner and docs complete; final checks recorded separately; live 6.2 and supported-format gate 6.3 remain open |

Progress is 30/33. Only live/model acceptance tasks 3.4, 6.2 and 6.3 remain open after local verification (the tasks.md checkboxes are authoritative). See [validation.md](validation.md) for review findings and current evidence.

## Git state

- Branch `main` at `58dace3`, which equals `origin/main`, the only remote branch and the GitHub default. Its history contains no third-party samples, and `temp/Odata/*` is git-ignored except `00 我/`.
- This change lives on local branch `ft/spreadsheet-intake`, which sits on top of `main`:
  - `4596b56` docs (the OpenSpec change)
  - `9f4a4d8` feat (groups 1–2)
  - `90cfc28` handoff update
  - 2026-10-07 follow-up: Group 2 correction, Group 3 implementation/tests, Group 4 adapter/chunk implementation, Group 5 intake/Review work and follow-up documentation/model selection

  Commit/push of this branch was explicitly authorized on 2026-10-07. Do not merge main or open a PR without a separate request.
- The throwaway Result prototype (variants A/B/C on Sample #23) lives only on local branch `prototype/result-clarity` (`db06dfc`); never merge it. The chosen design was **A, plus B's 44px map button**.

## Evidence for the current working tree (2026-09-30)

- `npm run typecheck` and `npm run build` pass. Build output has only the existing chunk-size warning.
- Unit: 344 tests pass. Component: 82 tests pass.
- Playwright, desktop-chromium and mobile-chromium:
  - specs run: `generalized-result`, `golden-data`, `golden-smoke`, `golden-runtime`, `captured-benchmark-review`, `review-workflow`, `newspaper-visual-system`
  - result: 47 passed, 1 skipped (the skip is pre-existing)
- Playwright platform-chrome and platform-webkit (storage/credential): 18 passed.
- The full Playwright suite (all specs) has not been run on this tree.

The section above is historical evidence for the committed groups 1–2 tree.
Current 2026-10-01 evidence after the follow-up:

- Group 4 source/date/chunk reviews passed after their documented P2 fixes. Group 5 passed both axes on round 1; benchmark runner passed both axes after two P2 corrections. Detailed results are in `validation.md`.
- Eight real local XLSX samples passed extraction/source validation. The three acceptance fixtures also passed prepare-only request preflight. No provider was invoked and this is not semantic acceptance.
- Desktop/mobile flows cover sheet selection, excluded sheets, unchanged-source retry, changed-scope identity, mini-grid scrolling, Review confirmation, reload and prior-trip preservation. Actual-entry production CSP/lazy-load checks are recorded in `validation.md`.
- The last full serial browser run had 114 passed, one existing skip and one intermittent Markdown Review failure. The final desktop diagnostic had 48 passed and one skip; the same Review case and Golden case passed without source changes or relaxed timeouts. The original failure remains an unreproduced verification limitation; no production defect or fix is claimed.
- SheetJS audit has no `xlsx` advisory entry. The overall audit reports two existing high findings in `fast-uri` and `undici`; no unrelated dependency was updated.
- No live Gemini call, key read, commit, push or deployment occurred.

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
- Review found that a valid Markdown heading longer than 256 characters prevented confirmation because its read-only group label exceeded the Canonical bound. The label limit now matches validated source display text (200,000 characters), with a regression proving exact preservation through authoritative validation and decoding.

**Group 3 (3.1–3.3 only)**:
- New requests and generated local/provider schemas require `semantic-interpretation-result.v2`; historical v1 schema/artifacts remain unchanged.
- Optional `coverage.block_disposition_ranges` uses inclusive source-order endpoints and only `interpreted`/`supporting`. Individual dispositions remain required and may be mixed with ranges.
- Local expansion rejects gaps, overlaps, unknown endpoints and reversed ranges before existing gates, returns individual coverage without mutating the provider value, and maps failures to fixed recoverable intake copy.
- Executable interpreter guidance and actual-request tests cover the version and range rules. This does not satisfy live acceptance task 3.4.

**Group 4:**
- Official pinned SheetJS CE 0.20.3 is imported only inside the adapter and dynamically loaded for spreadsheet work. XLSX cells retain displayed formatting, cached formula states, exact links, date-system hints, merge anchors and independently populated covered cells. UTF-8 CSV stays one raw-text sheet. Hidden sheets are skipped; `.xls` and invalid containers remain rejected.
- Source validation enforces exact sheet/A1 locators, sheet identity/order, bounds, permitted merge containment, header context, source-format agreement, 50,000 evidence units and 20 MB serialized document limits. File bytes are capped at 128 MiB and visible sheets at 19. Exact bytes plus normalized original sheet indices determine source identity, without filenames.
- Deterministic missing-year checks use cited displayed text only. Review clears unsupported dates while retaining the partial source expression and existing Day label; confirmation/reload are verified at both browser widths. Hints cannot supply an absent visible year.
- Over-budget multi-sheet sources are preflighted completely before serial provider requests. Single over-budget sheets fail before any call. All chunk coverage and source identities are reconciled before Review; IDs are source-scoped, supported same-date Days may merge, conflicts remain visible, and no partial result succeeds.
- Two chunk-review defects were fixed: unsupported trip bounds now retain their own original partial-date notes, and provider-controlled finding prefixes cannot delete genuine Review warnings. Both axes passed round 2.
- Import/source/Review/integration READMEs and interpreter guidance describe the actual boundaries. Group 5 wires this into the Home/Review journey; spreadsheet format acceptance is still gated.

**Group 5 and shared prepared-source ownership:**
- XLSX/CSV use the existing Home file surface. Multi-sheet selection is ordered, defaults to all visible sheets, requires at least one selection and records exclusions. Metadata inspection uses application deadlines/stop ownership and makes no provider request.
- One workflow-owned, memory-only validated prepared source supports same-selection retry. File, paste, mode and selection changes invalidate it; inactive results cannot replace it. Shared owner task 4.10 is checked, while its other open tasks remain open.
- Review shows a bounded sparse mini-grid, sheet scope/coverage accounting, and one expandable recorded-image warning. Raw workbook objects, auxiliary hints and parser metadata do not enter CanonicalTrip or persistence.
- Spreadsheet upload copy remains experimental; supported-format declaration awaits all three live layout gates. There is no silent alternate-model path for spreadsheet intake.

**Local acceptance tooling and docs:**
- The local runner reads the three real fixtures in place, defaults to prepare-only with zero provider calls and writes bounded allowlisted artifacts to local temp. Original parser quality and Review recovery quality stay separate; absent annotation judgments remain pending.
- Actual finding IDs/source refs must prove annotated ambiguities. External annotations have strict closed fields and size/type bounds before artifact creation.
- Current product docs and delta specs now agree on whole-sheet chunking: one oversized sheet fails before provider work; region chunking requires evidence from 6.2.

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

1. The 2026-10-07 user decision selects exact `gemini-3.5-flash`. Task 3.4 and the three-layout live gates must rerun against that exact model on response v2; old failed 3.5 evidence remains historical. Do not silently substitute a model or increase retry limits. Deterministic parser/schema suites already pass; no live authorization was given.
2. Keep task 3.4 unchecked until its full acceptance evidence is recorded. Execution success alone is not semantic acceptance or production-default activation.
3. All offline implementation and reviews are complete. Keep spreadsheet guidance experimental until 6.2 passes all three layouts and 6.3 is explicitly satisfied.
4. Preserve the original intermittent browser failure record and its passing diagnostic reruns; do not invent a fix or repeatedly rerun unchanged tests.
5. Commit/push of `ft/spreadsheet-intake` was authorized on 2026-10-07. PR, merge or deployment remain separate requests. No Hosted Delivery implementation is authorized by this slice.
