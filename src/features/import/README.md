# Import feature ownership

Own Home intake, `TextSourceInput` normalization, structure-preserving Markdown extraction, progress, and source failure recovery.

## Spreadsheet adapter and experimental Home entry

- `spreadsheetSourceAdapter` is the sole runtime SheetJS consumer. CE 0.20.3
  comes from the fixed official tarball with lockfile integrity. Library types,
  workbooks and original bytes never cross into the source domain or Result.
- `prepareSpreadsheetFile` reads locally and lists visible original-index sheet
  identities without extracting XLSX worksheet cells. `extractSpreadsheetSource`
  reads only the selected visible sheets, hashes file bytes plus normalized
  selection, and returns a document only after the authoritative source gate.
- CSV is one UTF-8, comma-delimited sheet (an explicit `sep=` directive may
  select another delimiter); values remain text. XLS is rejected until a real
  sample passes its separate gate.
- Sparse populated addresses drive extraction, rather than an inflated `!ref`.
  Merge anchors retain full bounds; independently populated covered cells remain
  explicit children with a warning that their text is hidden. Headers are null
  unless reliable structural metadata exists; wording is not header inference.
- Cached formulas are never evaluated. Display formatting uses SSF with the
  original number format and date system, including a narrow compatibility
  correction for unquoted CJK literals. Unsupported formatting fails safely;
  raw serials are never substituted for display text. Hyperlinks remain exact.
- File bytes, visible sheets, evidence count and serialized-source bytes have
  independent hard limits. Failures expose fixed, phase-specific copy, without
  source snippets or library exception text. Whole-sheet provider budgeting and
  reconciliation belong to application interpretation, not extraction.
- Home accepts experimental XLSX/CSV through the same upload entry. Application-owned inspection lists visible metadata under deadlines, then the unsubmitted controls choose at least one sheet (CSV/single-sheet skips selection). Supported-format guidance remains gated by live three-layout acceptance. Raw workbook/source state remains memory-only.

- `Home` composes the entry surface. It does not own Markdown processing or Canonical JSON control state.
- `useMarkdownIntake` owns only unsubmitted file/paste form controls. It derives processing stage, prepared source, failures and busy state from the application workflow. Input replacement cancels that workflow before changing selection.
- Canonical JSON import remains a separate local control path because it bypasses Markdown extraction and Gemini interpretation.
- Markdown file and pasted input converge at `TextSourceInput`; spreadsheet submissions use honest application metadata and the same validated source document, not a fabricated text input.
- `markdownSourceAdapter` is one Source Adapter. It emits the shared source-domain `UnifiedSourceDocument` (`src/domain/source`) and declares no source-neutral type of its own; Markdown structure travels as `markdown_block` structural evidence on each evidence unit.
- The application `useTripIntakeWorkflow` validates every extracted document through `validateUnifiedSourceDocument` before it becomes a prepared candidate. `PreparedSource.document` is the branded `ValidatedUnifiedSourceDocument`, so unvalidated adapter output cannot reach interpretation, and a rejected document surfaces the bounded `source_document_invalid` failure.
- Evidence-unit IDs keep their `:block:` segment verbatim. They are frozen by the External Markdown Benchmark #001 mapping and by existing coverage fixtures; the ID is opaque downstream.
- `markdownSourceAdapter` must use a structure-aware parser or AST as its primary extraction boundary. It preserves hierarchy, source positions, links, assets, and unknown blocks; line-by-line regular expressions are not an acceptable primary parser.
- Extraction must not discard or flatten evidence early to fit `ParsedTripDraft` or `CanonicalTrip`. Semantic narrowing happens only after the complete `UnifiedSourceDocument` boundary.
- Regression fixtures must cover nested and multiline lists, tables, mixed Markdown syntax, and other structures whose meaning would be lost by line-oriented parsing.
- Raw input and `UnifiedSourceDocument` are session-only. Only confirmed CanonicalTrip may cross into durable trip persistence.

## Processing and recovery

- Application workflow state owns prepared/validated source, progress, failure, stage/overall deadlines, cancellation, and stale-result rejection, beginning before file reading or credential loading.
- The full-screen processing modal exposes `停止這次判讀` while accidental Escape/backdrop dismissal stays disabled. Stop, timeout and failure return to preserved-source recovery and do not change the confirmed trip. Selection also survives Review cancellation; successful confirmation and explicit local clearing discard the raw controls.

- One application prepared-source cache serves both Markdown and spreadsheet downstream retries; all form/mode/selection edits explicitly invalidate it. Retry retains source identities, reloads the credential and receives fresh ownership. The feature never stores parser output or its own processing timers.
