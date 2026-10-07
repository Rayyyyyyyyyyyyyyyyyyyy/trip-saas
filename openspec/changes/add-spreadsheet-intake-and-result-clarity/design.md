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
- Group labels preserve the trimmed source heading or sheet name verbatim. Their schema bound matches the source evidence `display_value` limit (200,000 characters), so a valid long Markdown heading cannot become an uneditable confirmation blocker.
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

**Group 3:**
- New requests require `semantic-interpretation-result.v2`. The v1 schema and historical captured responses remain unchanged; a v1 response cannot satisfy a new v2 request.
- `coverage.block_dispositions` remains the required individual-disposition array (possibly empty). Optional `coverage.block_disposition_ranges` contains `{ from_id, to_id, disposition }` with inclusive endpoints in validated document order, restricted to `interpreted` and `supporting`. Both forms may coexist but each evidence unit must be covered exactly once.
- Source coverage expansion runs after strict response-schema validation and before the existing draft/fidelity gates. It produces a fresh coverage object containing only individual dispositions in document order, leaving the provider response untouched. Review and benchmark scoring consume the expanded result.
- Expansion is bounded by the expected evidence-unit count. Unknown endpoints, reversed ranges, gaps and overlaps fail as `coverage_invalid`; existing individual-only gate failures retain their vocabulary. The intake surface displays fixed recoverable coverage-failure copy and preserves the active trip.
- Range support does not depend on prepared-source retry task 4.10; visible-sheet selection in task 5.2 does. Live gate 3.4 and SheetJS installation 4.1 retain their explicit user-authorization requirements.

**Group 4 (fixed before adapter coding):**
- Authorized dependency (2026-10-01): SheetJS CE 0.20.3 from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, as documented by the [official installation guide](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/). The manifest and lockfile change together with fixed tarball integrity.
- Read metadata before selected-sheet extraction. Visible sheet IDs use original workbook indices (`sheet:<index>`); hidden sheet data never becomes evidence. The selected IDs are normalized to workbook order and hashed together with the exact file-byte hash. Filenames are excluded from identity.
- `input_mode` gains `spreadsheet_file` and `csv_file`; optional `excluded_sheets` records user-excluded visible names. Existing Markdown values remain valid. These session-only additive source fields do not change CanonicalTrip.
- The tabular source variant gains auxiliary `typed_hint`: number/boolean values or date serial plus the workbook's 1900/1904 date system. `display_value` remains formatted text; hints cannot establish an absent year. Formula text stays structural metadata; a missing/error cache produces an extraction finding rather than calculation. No header is inferred from a row's wording or position alone; without reliable structural header metadata, `header_ref` is null.
- Enumerate populated cell addresses, never every coordinate in a formatting-inflated `!ref`. Merge anchors emit one unit carrying the complete merge bounds. A covered cell with independent content emits a separate cell unit linked by `parent_ref` and `merge_ref` to its anchor, with a `COVERED_CELL_CONTENT` warning that it is hidden inside a merge. An empty anchor is retained when needed for such context. Integrity permits only these explicit contained child overlaps; unrelated overlaps still fail.
- Metadata inspection uses `sheets: []` rather than `bookSheets: true`: the latter omits sheet visibility. It reads workbook metadata without extracting worksheet cells; selected extraction reads only original sheet indices.
- Strict parsing keeps `WTF: true` and defers numeric display formatting (`cellText: false`) to SSF. Known unquoted CJK date/time literals (`年月日時分秒`) are quoted only for formatting if the original format fails; quoted/escaped content is preserved. Formatting failure never falls back to a raw serial. CSV uses UTF-8 text and an explicit DSV parser prefix, preserving literal leading `<`, leading zeroes and partial dates rather than guessing XML or cell types.
- Missing-year protection checks non-null trip start/end and Day dates against their own cited displayed evidence only. A schema-compatible non-blocking `MISSING_YEAR` finding and a bounded session-only date decision are separate outputs. The application computes decisions from its validated source; the closed Review adjustment clears unsupported full dates to null, preserves source-backed partial text in Day labels or supporting notes, and logs the adjustment without mutating the original interpretation. Typed hints, raw serials, filenames and unrelated sheets cannot establish a year. The existing linear Day-binding check applies only to Markdown, since tabular date context can run across rows or columns.
- Whole-sheet chunking is owned by `interpretTrip`, using the transport's actual prepared-byte/token estimates. It first validates and preflights every sheet chunk; an oversized single sheet causes zero provider calls. Chunk documents retain original source/evidence IDs, locators and sheet order, with dense chunk-local evidence order. Requests run serially under the same signal and overall workflow run, and no partial result reaches Review.
- Reconciliation namespaces provider IDs and rewrites their references; only Days with the same non-null complete date may merge, retaining all source refs and source-supported labels/titles. Unknown-date Days and unsupported-year Days stay separate. Clearing unsupported trip bounds retains each chunk’s own partial-date text and source refs as unresolved notes; a different sheet’s year cannot supply that missing year. Trip date bounds stay null if any chunk omits the corresponding bound; otherwise the observed range is combined. Conflicting non-null timezones fail; title differences become a Review finding. Semantic duplicate events and relationship conflicts fail global validation rather than being deleted. A chunk returning `insufficient` makes the complete result insufficient with full combined coverage, never a partially successful draft. Local fidelity findings are recomputed against the complete original source after reconciliation.
- Limits for the first extraction slice: 128 MiB file bytes, 19 visible sheets, 50,000 evidence units, and 20 MB serialized source document. Exceeding a limit fails explicitly without truncation. Provider request limits remain independently enforced and whole-sheet chunking is task 4.7.
- Local metadata inspection on 2026-10-01 found the eight workbooks range from 21 KB to 107 MB with 86–4,317 data/formula cells. The three acceptance samples have approximately 136 (Busan), 86 (Penghu), and 282 (Nagoya) data/formula cells. Formatting-only cells do not count as content. The 128 MiB bound accommodates the existing image-heavy Nagoya fixture; this is extraction sizing evidence, not parser acceptance or mobile performance proof.
- `.xlsx` requires a real XLSX container rather than SheetJS's permissive text fallback. CSV remains text with raw values, preserving date/time strings without automatic coercion. `.xls` remains unsupported until a real sample passes its separate acceptance.
- Tabular locators use `sheet:<verbatim sheet name>!<A1 cell or range>`; the complete locator must match the structural sheet name and coordinates. Sheet identity remains the opaque original-index ID, separate from the readable locator.
- Deterministic tabular validation checks sheet identity/order consistency, ascending sheet/row/column placement, coordinate and merge bounds, and same-sheet preceding header references. The declared source format must match every structural evidence variant, so relabeling tabular data as Markdown cannot bypass the gate. Every adapter output must pass this gate before a provider call.

## Risks / Trade-offs

- **[Provider emits wrong ranges (off-by-one, overlaps)]** → Local expansion rejects them as a coverage failure. The failure code is mapped through `describeIntakeFailure`, and the existing retry path applies. Range misuse is measured during acceptance.
- **[Response schema bump regresses Markdown quality]** → Benchmark #001 is rerun on the new version before merge. If Markdown regresses, ranges can be limited to tabular sources by prompt guidance while the schema stays shared.
- **[SheetJS distribution or supply-chain drift]** → Pin the exact version and tarball integrity, and import it only in the adapter. `npm audit` must show no advisories for the pinned version at install time.
- **[Large workbooks (19 sheets, 1,000-row used ranges from formatting)]** → Trim to non-empty cells, apply the hard limits (19 visible sheets plus a file-size cap chosen in implementation), and fail with a technical-limit reason instead of truncating.
- **[Typed-hint year misused by the interpreter]** → Interpreter guidance, plus the deterministic missing-year finding whenever a confirmed year is not present in any cited display text.
- **[Map search opens the wrong place]** → It is labeled as a search, uses only the confirmed verbatim text, and never presents coordinates as fact.
- **[Canonical v3 migration]** → The decoder is non-destructive, failure preserves the prior record and active pointer, and it is covered by the existing platform storage tests.
- **[Overlap with the active change's 4.9–4.13]** → Sheet-selection identity and retry reuse are implemented on top of 4.10. If 4.10 is not done first, this change's task 5.2 waits for it rather than duplicating prepared-source logic.

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


**Group 5 (fixed before coding):**
- Prepared-source reuse is owned by the application, using one in-memory cache for Markdown and spreadsheet intake. Unchanged submissions reuse a validated input/document after downstream failure with fresh session/request and a fresh credential load. Any file, paste, mode or sheet-selection edit explicitly invalidates that cache and cancels old ownership. A late or aborted preparation cannot populate it. This implements the active owner's 4.10 prerequisite rather than a spreadsheet-specific retry cache.
- Spreadsheet inspection runs under the same application coordinator and reading/extraction deadlines, exposes only visible sheet metadata, and closes the blocking processing surface before selection. Selection defaults to all visible sheets in original order and requires at least one. Selected original indices determine source identity; changing selection invalidates in-flight and prepared work. No workbook objects leave the adapter.
- Tabular Review excerpts carry only sheet identity/name, row/column bounds, displayed text and source-neutral locators. Empty displayed text stays empty, without borrowing raw or typed values. Mini-grids use cited relative positions, Excel column letters and row numbers, explicit gap markers, and `未引用` for unknown intersections. They never allocate a dense worksheet rectangle.
- Each mini-grid frame contains at most eight projected excerpt regions; following frames retain the remainder. Cell fragments stay bounded to 4,000 characters and continue in subsequent excerpts. Covered-cell content is shown at its own A1 location, separately from its merge anchor. Horizontal scrolling stays inside the frame at mobile widths.
- One non-blocking image disclosure lists only actual source image references and their locators, deduplicating repeated local warnings. SheetJS extraction does not currently inventory embedded workbook images; Review states that limitation conditionally without inventing a zero count or attachment references.
- Coverage copy is `已選分頁 100% 覆蓋（來源單元均已交代，包含未判讀）`, followed by excluded names and the unparsed count. Coverage is accounting, not semantic acceptance. Empty selected sheets do not justify an invented selected-sheet count from evidence units.
- Home accepts experimental `.xlsx`/`.csv` submissions while supported-format guidance remains gated until 6.2/6.3. PDF, screenshots/images and DOCX remain unsupported; `.xls` remains rejected. The existing Markdown/paste and explicit Osaka sample paths remain available.

**Group 6.1 benchmark evidence contract:**
- External annotations, including `TODO` records, pass a bounded, closed-field decoder before artifact construction or collection. Only the declared annotation fields are projected; unknown fields or malformed/oversized values fail with a fixed technical code and are never checkpointed. Raw source, provider envelopes and production ReviewSession payloads are not annotation fields.
- A required ambiguity finding is judged against the exact original pre-Review result. The assessment names `finding_refs` containing actual root/draft finding IDs whose source refs overlap the annotated ambiguity. Boolean claims and prose alone cannot establish surfacing. If the original contains no associated finding, the criterion fails; missing, unknown or unrelated assessment references remain pending. Human evidence still judges whether the cited finding actually communicates the annotated ambiguity. Review recovery cannot repair the original parser score.
