## Why

Only 2 of the 23 real itinerary sources collected in `temp/Odata` are Markdown; spreadsheets are the most common structured format (5 travelers, 8 workbooks), so the Markdown-only intake cannot serve most real users. Human Review of the passing Markdown path also showed that Result reads as noisy and inert: every item repeats optional/tentative/flexible labels, place text duplicates the title, empty image frames dominate reference sections, and places cannot be opened on a map.

The product owner decided on 2026-09-30 to bring the narrow V0.2 Spreadsheet Travel Table slice forward, ahead of gated V0.1 Hosted Delivery, together with these Result clarity fixes. The decisions were settled by interview and cross-reviewed to consensus with a second reviewer (Codex).

## What Changes

- Enable `.xlsx` and `.csv` file intake. `.xls` is included only when the selected parsing library supports it natively and it passes the same acceptance; otherwise it stays an explicit follow-up and the UI does not claim it.
- Spreadsheet Source Adapter flattens every visible sheet into the dormant `tabular_region` evidence variant: sheet identity/order, A1 locators, merge ranges, header context, displayed text, formula cached values, and cell hyperlinks. It does not assign itinerary meaning from position; the existing Gemini interpreter recognizes row-per-event, calendar-grid, and column-per-day layouts.
- Multi-sheet workbooks show a visible-sheet selection step (default all selected) before interpretation. User-excluded sheets never enter `UnifiedSourceDocument`, the normalized selection is part of source identity, and coverage is stated as covering the selected sheets.
- Evidence text is the cell's displayed text. Typed values (date serials, day fractions) are auxiliary hints only; a year present only in the typed value is treated as a missing-year finding, not a confirmed fact.
- Evidence units are cell/merged-cell granular. **BREAKING (schema)**: the interpretation response may report contiguous evidence-unit ID ranges that share one disposition; the browser expands and verifies them (no gaps, overlaps, or out-of-range IDs). This is a versioned `SemanticInterpretationResult` change, and it requires rerunning External Markdown Benchmark #001.
- Large workbooks follow the existing structural chunking contract, with global reconciliation before Review.
- Review shows spreadsheet evidence as a mini-grid that preserves the cited cells' relative positions and row/column labels. Unimported images collapse into one non-blocking summary line.
- Supporting items gain a persisted, source-neutral `group` (xlsx: sheet name; Markdown: owning heading). **BREAKING (persistence)**: new Canonical schema version with non-destructive decoding of v2 records (`group: null`).
- Result changes:
  - Supporting groups render as default-collapsed sections with item counts.
  - Empty "image attachment not provided" frames are removed.
  - Places link to maps: a source URL (including a cell hyperlink) wins; otherwise a clearly labeled Google Maps *search* link is built from the verbatim place text. Place text identical to the title is not repeated.
  - Labels are reduced: members of a choose-one group omit optional/tentative; flexible is not shown as a label; a standalone item shows at most one label (tentative over optional). Canonical data is unchanged.
- Roadmap and format guidance are updated so spreadsheet intake precedes Hosted Delivery, which stays gated.
- Out of scope: extracting or displaying embedded xlsx images and Markdown zip attachments, image/screenshot interpretation, PDF input, DOCX, manual column mapping, and a non-AI spreadsheet path.

## Capabilities

### New Capabilities
- `spreadsheet-source-intake`: Covers:
  - spreadsheet file entry and accepted extensions/limits
  - visible-sheet selection and its source identity
  - display-text and typed-hint extraction; merge, header, and hyperlink evidence
  - hidden-sheet exclusion, structural chunking, and technical rejection rules
  - the local three-layout spreadsheet acceptance gate

### Modified Capabilities
- `markdown-source-intake`: Home entry and format guidance present spreadsheet import as enabled (`.xlsx`/`.csv`, conditional `.xls`) instead of gated.
- `validated-source-document`: Tabular evidence becomes operable. Evidence units are cell/merged-cell granular, and selected-sheet scope is part of the validated document identity.
- `trip-semantic-interpretation`: Complete accounting accepts versioned range-compressed dispositions that are expanded and verified locally.
- `evidence-backed-trip-review`: Review evidence changes:
  - mini-grid tabular excerpts
  - a single non-blocking summary for unimported images
  - coverage wording scoped to the selected sheets, listing user-excluded sheets
- `local-canonical-trip`: Supporting items persist a confirmed `group` under a new Canonical schema version with v2 compatibility.
- `trip-result-ui`: Result presentation changes:
  - Map actions allow a labeled place-search link when no source URL exists (reverses "no guessed map query").
  - Label display is reduced.
  - Empty image frames are removed.
  - Supporting groups are collapsed.
- `deterministic-result-placement`: The projection places supporting items into ordered, reachable groups without making the Renderer source-aware.

## Impact

- **Code**:
  - `src/features/import`: a new spreadsheet adapter and sheet-selection UI, plus Home entry updates.
  - `src/domain/source`: tabular evidence activation, identity hashing, and coverage range expansion.
  - `src/integrations/gemini`: response schema version.
  - `spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md`: tabular guidance.
  - `src/features/review`: mini-grid and image summary.
  - `src/domain/trip` and `src/persistence`: supporting `group` and a Canonical version bump.
  - `src/features/result`: `createTripPresentation`, `ResultEntity`, and `ResultDay`.
  - `src/features/golden` must not regress.
- **Dependencies**: one browser spreadsheet parsing library (to be selected in design; it must read displayed text, merges, hyperlinks, and the hidden-sheet state without executing workbook code).
- **Gates**:
  - External Markdown Benchmark #001 must be rerun because the response schema changes.
  - A new local spreadsheet acceptance covers three layouts (Busan row-per-event, Penghu calendar grid, Nagoya column-per-day) and reads fixtures from the git-ignored `temp/Odata`.
  - Hosted Delivery and the production default model remain gated as before.
- **Coordination**: Open tasks 4.9–4.13 of `complete-faithful-markdown-journey` own prepared-source retry identity and Review gates. Sheet-selection identity builds on 4.10 and must not fork it.
- **Docs**: `AGENTS.md` roadmap, `spec/01_CANONICAL_CONTEXT.md`, `spec/03_PIPELINE_SPEC.md`, `spec/05_V0_IMPLEMENTATION_PLAN.md`, `spec/06_RESULT_UI_SPEC.md`, `spec/MVP_UI_SCOPE_REPORT.md`, and the affected `src/*/README.md` files.
