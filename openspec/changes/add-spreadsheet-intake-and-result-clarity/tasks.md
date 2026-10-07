## 1. Result clarity (source-agnostic, ships first)

- [x] 1.1 Move the `goldenMapHref` rule into a shared utility; project a map action per entity (source URL first, else labeled Google Maps search from verbatim place text, none without place) and unit-test all three cases
- [x] 1.2 Project place/title de-duplication (whitespace-normalized equality) and render the map action on the title line or the place line accordingly
- [x] 1.3 Project reduced state labels (alternative members drop optional/tentative, flexible never a label, standalone at most one with tentative first) and update `ResultEntity` to render only projected labels
- [x] 1.4 Drop unresolved image supporting items from rendered output while keeping them in projection verification; remove the empty image frame rendering path
- [x] 1.5 Component tests for Result covering the Seoul Sample #23 screenshots' cases (free time, choose-one restaurants, missing timetables) at mobile and desktop widths; verify Golden viewer is unchanged

## 2. Supporting groups and Canonical v3

- [x] 2.1 Add `group: { id, label, order } | null` to `SupportingItem`/`DraftSupportingItem`, the Canonical JSON schema, and generated validators; bump to `canonical-trip.v3`
- [x] 2.2 Decode v2 → v3 with `group: null` non-destructively (v1 path retained); tests for migration success, failure preserving prior record/active pointer, and group id/label/order consistency
- [x] 2.3 Derive groups deterministically from `source_refs` after the response gates (spreadsheet: sheet; Markdown: nearest ancestor heading; multi-sheet refs → null) and carry them through Review confirmation
- [x] 2.4 Project supporting items into ordered groups with retained counts plus the ungrouped region; verification fails on missing/duplicate items
- [x] 2.5 Render groups as default-collapsed accessible disclosures titled `label（count）`; keyboard and screen-reader tests at both widths

## 3. Range-compressed coverage (response schema version)

- [x] 3.1 Add the versioned range disposition form `{ from_id, to_id, disposition }` (interpreted/supporting only) to the `SemanticInterpretationResult` schema, provider projection, and generated validators
- [x] 3.2 Implement local range expansion in `sourceCoverage` with gap/overlap/unknown/reversed checks before existing gates; map the new failure code through `ParseTripFailureCode` and `describeIntakeFailure`
- [x] 3.3 Update `spec/TRIP_RUNTIME_SEMANTIC_INTERPRETER.md` for ranges and add the actual-request prompt test update
- [ ] 3.4 Rerun deterministic parser fixtures and live External Markdown Benchmark #001 on the new schema version (authorized key); record results in `temp/validation/` without relabeling prior evidence

## 4. Spreadsheet Source Adapter

- [x] 4.1 Add pinned SheetJS CE from the official distribution with lockfile integrity; confirm `npm audit` clean for that version; import it only inside `src/features/import`
- [x] 4.2 Implement extraction to `tabular_region` evidence units: non-empty cells and merge anchors, sheet/row-major stable IDs, A1 locator, merge range, structural header ref, displayed text, cached formula value, hyperlink, typed hint; hidden sheets skipped; no formula execution
- [x] 4.3 Enforce technical rejections (corrupt/encrypted, unsupported extension, >19 visible sheets, file-size cap, no usable content) with phase-specific safe failure copy
- [x] 4.4 CSV as one visible sheet; `.xls` stays rejected unless 4.2 acceptance passes on a real `.xls` sample
- [x] 4.5 Activate the tabular variant in `validateUnifiedSourceDocument` integrity checks; add `excluded_sheets` metadata; hash normalized selection into `source_id`
- [x] 4.6 Add tabular guidance to the interpreter document (three layouts, typed-hint year rule, exact hyperlinks, reference sheets as supporting) and a deterministic missing-year finding when a confirmed year is absent from cited display text
- [x] 4.7 Implement whole-sheet chunking with per-chunk validation and global reconciliation; a single over-budget sheet fails with a technical-limit reason (region chunking only if 6.2 shows it is needed)
- [x] 4.8 Update `src/features/import/README.md` and `src/domain/source/README.md` boundaries

## 5. Intake UI and Review

- [x] 5.1 Extend Home file entry to accept `.xlsx`/`.csv` and update format guidance (image limits, unsupported formats); keep guidance hidden for spreadsheets until 6.3 passes
- [x] 5.2 Build the visible-sheet selection step (source order, default all, at least one required); selection change invalidates prepared source and in-flight request via `tripWorkflow` identity; retry reuses selection (builds on active change task 4.10)
- [x] 5.3 Build the Review mini-grid for `tabular_excerpt` (relative positions, column letters, row numbers, sheet label, elision marker, contained horizontal scroll on mobile)
- [x] 5.4 Add the single expandable unimported-image summary line at the top of Review
- [x] 5.5 Coverage copy for spreadsheet sources: complete for selected sheets, excluded sheet names, unparsed count
- [x] 5.6 Browser tests for upload → selection → processing → Review → confirm → Result on desktop and mobile Chromium with a synthetic workbook fixture (no real samples committed)

## 6. Acceptance and documentation

- [x] 6.1 Add a local-only spreadsheet benchmark runner reading `temp/Odata` (Busan row-per-event, 澎湖 calendar grid, 名古屋 column-per-day) with the faithful rubric; output to OS temp / `temp/validation`, never committing sample content
- [ ] 6.2 Run authorized live acceptance on the three fixtures; record per-fixture results (missing/invented/unsupported critical facts, coverage, range misuse) and measure whether region chunking is required
- [ ] 6.3 Only after 6.2 passes on all three layouts, enable spreadsheet format guidance as supported; otherwise keep it gated and record the failure
- [x] 6.4 Update `AGENTS.md` roadmap (spreadsheet slice before Hosted Delivery), `spec/01_CANONICAL_CONTEXT.md`, `spec/03_PIPELINE_SPEC.md`, `spec/05_V0_IMPLEMENTATION_PLAN.md`, `spec/06_RESULT_UI_SPEC.md` (map search, labels, image frames, groups), `spec/MVP_UI_SCOPE_REPORT.md`, and `CONTEXT.md` terms (supporting group, range disposition, selected-sheet scope)
- [x] 6.5 Run `npm run build`, unit/component/browser suites, and strict `openspec validate`; report failures and evidence limits
