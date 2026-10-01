## Context

Current state:
- The pipeline is Markdown-only.
- `UnifiedSourceDocument` already declares a dormant `tabular_region` evidence variant (`src/domain/source/types.ts`).
- Review already has a `tabular_excerpt` evidence kind (`src/domain/source/reviewEvidence.ts`).
- `spec/03_PIPELINE_SPEC.md` §458–495 already defines the spreadsheet adapter contract:
  - accepted extensions: `.xlsx`, `.xls`, `.csv`
  - at most 19 visible sheets; hidden sheets ignored
  - cached display values; hyperlinks
  - structural chunking
  - `insufficient` rather than rejection for irregular layouts

This change activates that seam and does not invent a parallel one.

Real samples (`temp/Odata`, git-ignored) show four workbook shapes:
- row-per-event (Busan, 清州, 釜山行)
- calendar grid, with hour rows × date columns (2024韓國, 澎湖)
- column-per-day (JP0107, 名古屋)
- non-itinerary reference sheets (food lists, fares, packing, ticket guides of up to 322 rows)

Merged cells and embedded images are common.

Human Review of the passing Markdown path found Result noisy:
- repeated optional/tentative/flexible labels
- place text duplicating the title
- empty image frames
- no map access

Decisions were settled with the product owner and cross-reviewed to consensus with Codex on 2026-09-30.

The active change `complete-faithful-markdown-journey` still owns open tasks 4.9–4.13 (single-model path, prepared-source retry identity, candidate-aware Review gates) and the exact-model production default. This change must build on those, not fork them.

## Goals / Non-Goals

**Goals:**
- `.xlsx` and `.csv` intake through the existing pipeline. The Gemini interpreter understands layout; the adapter stays structural only.
- User control over which visible sheets are sent.
- Evidence faithful to what the user sees in Excel (displayed text).
- Bounded provider output for large reference sheets without losing per-unit accounting.
- Result that reads cleanly: map access, reduced labels, no empty frames, grouped collapsed references.

**Non-Goals:**
- Extracting or displaying embedded xlsx images or Markdown zip attachments (next change).
- Image, screenshot, PDF, or DOCX interpretation.
- Manual column mapping, or any non-AI spreadsheet path.
- Committing real spreadsheet fixtures.
- Hosted Delivery or the production default model; both keep their existing gates.

## Decisions

### D1. Parsing library: SheetJS Community Edition, pinned from the official distribution
SheetJS provides what the contract needs:
- formatted display text per cell (`cell.w` via its number-format engine)
- merges (`!merges`)
- hyperlinks (`cell.l`)
- sheet visibility (`Workbook.Sheets[i].Hidden`)
- cached formula values, without executing formulas
- `.xlsx`, `.xls`, and `.csv` in one reader

The version must be pinned from the official SheetJS distribution with lockfile integrity. The stale public-registry `xlsx@0.18.x` has published advisories and must not be used.

- *Alternative: ExcelJS.* It exposes merges, hyperlinks, and sheet state, but it does not apply number formats to produce displayed text, and it has no `.xls` support. Displayed text is the evidence contract, so this is disqualifying.
- *Alternative: a hand-rolled OOXML reader.* It would reimplement number formatting; the cost and risk are high.

The library is imported only inside the Spreadsheet Source Adapter (`src/features/import`). Its types never cross into `domain/source`, and it is bundled, so no CSP change is needed.

### D2. Adapter stays structural; the interpreter reads layout
The adapter emits one evidence unit per non-empty cell or merged-region anchor. Each unit carries:
- `sheet_id`/`sheet_name`/`sheet_order`
- A1 `locator`
- row/column bounds
- `merge_ref`
- `header_ref` only when structurally certain (for example, a frozen header row); otherwise null
- `display_value` = the displayed text
- `cached_display_value`, `formula` (as text only), and `hyperlink_target`

A typed date/time value is attached as an auxiliary hint field, never as `display_value`. IDs are assigned in sheet order, then row-major order, so contiguous IDs are contiguous source regions (this is what makes D4 work).

`spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md` gains tabular guidance:
- recognize the three layouts
- do not treat typed-hint years as confirmed when the display text omits the year
- keep cell hyperlinks as exact URLs
- classify reference sheets as `supporting`

### D3. Sheet selection is part of source identity
A pure step between file read and document preparation lists the visible sheets (source order, default all). The normalized selection (sheet ids in source order) is hashed into `source_id` together with the file content hash.
- Excluded sheet names are carried on the document as `excluded_sheets` metadata, not as evidence units.
- Changing the selection invalidates the prepared source and any in-flight request through the existing `tripWorkflow` request identity.
- Retries reuse the prepared source per task 4.10 of the active change, so the selection persists.
- Single-sheet workbooks and CSV skip the step.

### D4. Range-compressed coverage dispositions (response schema version bump)
Per-cell coverage output would explode on reference sheets (322 rows × several columns). Codex rejected coarser row-level units: a row can mix itinerary, supporting, and unparsed content, and `locator_refs` must remain evidence-unit IDs, not A1 strings.

Instead, the response schema adds an optional range form `{ from_id, to_id, disposition }`, restricted to `interpreted` and `supporting`, while individual dispositions remain valid. `sourceCoverage` expands ranges by document order and verifies:
- no gaps
- no overlaps
- no unknown IDs
- no reversed or out-of-document ranges

Only then do the existing gates run. `unparsed` stays per-unit, because each needs its own reason.

This is a versioned `SemanticInterpretationResult` change: provider schema projection, generated validators, and fixtures are updated, and External Markdown Benchmark #001 is rerun on the new version.

- *Alternative: row units.* Rejected, as above.
- *Alternative: per-sheet disposition.* Too coarse for calendar grids, where one sheet mixes itinerary and notes.

### D5. Chunking reuses the pipeline contract
The adapter estimates the request size per selected sheet. When the size exceeds the budget, it splits whole sheets first, then contiguous used regions, carrying the header row and merge context into each chunk. Chunk responses are validated individually against their own expected-ID set, then reconciled globally (ID union, relationship and day merge, duplicate detection) before one draft enters Review.

The first implementation may ship with whole-sheet chunking only, provided that any single sheet over budget fails with a technical-limit reason rather than a truncated result. The three acceptance fixtures define whether region chunking is needed now.

### D6. Supporting `group` is derived deterministically, not by the provider
After the response passes the gates, each draft supporting item's group is computed from its `source_refs`:
- **Spreadsheet**: the sheet of its evidence units (id = sheet id, label = sheet name, order = sheet order). Items citing units from more than one sheet get null.
- **Markdown**: the nearest ancestor heading unit (id = heading unit id, label = heading text, order = heading source order).

Deriving the group deterministically avoids new provider fields and cannot hallucinate labels. The group flows through Review into `SupportingItem.group`.

CanonicalTrip moves to `canonical-trip.v3`, and the decoder maps v2 to v3 with `group: null`. Disclosure state stays in UI state only.

### D7. Result presentation rules live in the projection
`createTripPresentation` owns:
- **Map action resolution**: a source URL first; otherwise a search URL from the verbatim place text, reusing the `goldenMapHref` rule moved to a shared utility; no place, no action.
- **Place/title de-duplication**: whitespace-normalized equality.
- **Label reduction**: members of an alternative group drop optional and tentative; flexible is never a label; standalone items show at most one label, tentative before optional.
- **Grouping** of supporting items, with counts.
- **Dropping unresolved image supporting items** from rendered output, while still accounting for them in verification.

`ResultEntity` and `ResultDay` render only the projected roles, and the Result boundary test continues to forbid source-format imports.

### D8. Review additions
- The mini-grid is a component under `features/review` that consumes only `tabular_excerpt` projection data (cited cells with row/col indices and the sheet label). It scrolls horizontally inside its own frame on mobile.
- The unimported-image summary is one disclosure line at the top of Review that lists each reference when expanded. This satisfies "individually expose" without per-item noise.
- Coverage copy reads "已選分頁 100% 覆蓋" and names the excluded sheets and the unparsed count.

## Implementation clarifications (fixed before coding; reviewers check against these)

**Group 1 (settled in review):**
- Map actions use MUI `Button component="a"` with a minimum 44×44px target, `target="_blank"`, and `rel="noopener noreferrer"`.
- The projection supplies both the visible `label` and the `accessibleName`, and the visible label must be contained in the accessible name.
- Generalized Result labels:
  - source action: visible `地圖`, accessible name `開啟「<title>」的地圖連結`
  - search action: visible `搜尋 Google 地圖`, accessible name `以「<verbatim place>」搜尋 Google 地圖`
- Golden keeps its existing names: primary source `開啟地圖`, optional source = the entity title, search = `搜尋 Google 地圖`.

**Group 2:**
- `SupportingGroup = { id: string; label: string; order: number }`. The group `id` is opaque and deterministic:
  - spreadsheet: `sheet:<sheet_id>`
  - Markdown: `heading:<heading evidence unit id>`
- Group derivation is a pure function in `src/domain/trip` that takes the draft and the validated source document. It runs after the response gates and before Review. Review shows the group label on supporting items read-only; users do not edit groups in this change.
- Markdown: walk `parent_ref` up to the nearest `heading` unit. If there is no heading, the group is null. If an item's `source_refs` resolve to different groups, the group is null.
- `canonical-trip.v3`:
  - The only schema difference from v2 is the required `supporting_items[].group` (nullable).
  - Decoding v2 sets `group: null` and changes nothing else; v1 still decodes through v2 → v3.
  - Canonical JSON import accepts v1, v2, and v3.
  - The generated validators are regenerated by the existing build script.
- Result:
  - Grouped items render at the end of the existing 參考資料 aside, one MUI `Accordion` per group, collapsed by default.
  - The summary text is `<label>（<count>）`, with the same summary/region ARIA wiring as the optional Accordion.
  - Ungrouped items keep today's rendering, above the groups.
  - Disclosure state stays in component state and is never persisted.
- Golden Viewer data has no groups (all null) and must render exactly as before.

**Review scope for every group:** spec/design conformance and real defects (correctness, data loss, boundary violations, broken or failing tests). Low-severity polish is recorded, not looped. Each group gets at most 2 review rounds.

## Risks / Trade-offs

- **[Provider emits wrong ranges (off-by-one, overlaps)]** → Local expansion rejects them as a coverage failure. The failure code is mapped through `describeIntakeFailure`, and the existing retry path applies. Range misuse is measured during acceptance.
- **[Response schema bump regresses Markdown quality]** → Benchmark #001 is rerun on the new version before merge. If Markdown regresses, ranges can be limited to tabular sources by prompt guidance while the schema stays shared.
- **[SheetJS distribution or supply-chain drift]** → Pin the exact version and tarball integrity, and import it only in the adapter. `npm audit` must show no advisories for the pinned version at install time.
- **[Large workbooks (19 sheets, 1,000-row used ranges from formatting)]** → Trim to non-empty cells, apply the hard limits (19 visible sheets plus a file-size cap chosen in implementation), and fail with a technical-limit reason instead of truncating.
- **[Typed-hint year misused by the interpreter]** → Interpreter guidance, plus the deterministic missing-year finding whenever a confirmed year is not present in any cited display text.
- **[Map search opens the wrong place]** → It is labeled as a search, uses only the confirmed verbatim text, and never presents coordinates as fact.
- **[Canonical v3 migration]** → The decoder is non-destructive, failure preserves the prior record and active pointer, and it is covered by the existing platform storage tests.
- **[Overlap with the active change's 4.9–4.13]** → Sheet-selection identity and retry reuse are implemented on top of 4.10. If 4.10 is not done first, this change's task 3.x waits for it rather than duplicating prepared-source logic.

## Migration Plan

1. Land shared, backward-compatible parts first:
   - projection rules (map, labels, images, groups with null)
   - Canonical v3 with the v2 decoder

   Markdown users see the Result clarity fixes immediately.
2. Land the response schema version with range support; rerun Benchmark #001.
3. Land the spreadsheet adapter, selection step, and mini-grid behind the format acceptance. `.xlsx`/`.csv` become visible in format guidance only after the three-fixture acceptance passes; `.xls` separately.
4. Rollback: the v3 decoder stays (v3 data must remain readable); the spreadsheet entry can be hidden again without data impact.

## Open Questions

- The file-size cap and request token budget values, to be set from the three fixtures during implementation.
- Whether region-level chunking is needed now or whole-sheet chunking suffices for all 8 real workbooks (measure first).
- `.xls` inclusion depends on SheetJS `.xls` acceptance with a real sample; there is currently no `.xls` sample in `temp/Odata`, so `.xls` likely remains a follow-up.
