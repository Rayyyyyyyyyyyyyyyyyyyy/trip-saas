# Import feature ownership

Own Home intake, `TextSourceInput` normalization, structure-preserving Markdown extraction, progress, and source failure recovery.

- `Home` composes the entry surface. It does not own Markdown processing or Canonical JSON control state.
- `useMarkdownIntake` owns only unsubmitted file/paste form controls. It derives processing stage, prepared source, failures and busy state from the application workflow. Input replacement cancels that workflow before changing selection.
- Canonical JSON import remains a separate local control path because it bypasses Markdown extraction and Gemini interpretation.
- File and pasted input converge at `TextSourceInput`; file-specific checks stop there.
- `markdownSourceAdapter` is one Source Adapter. It emits the shared source-domain `UnifiedSourceDocument` (`src/domain/source`) and declares no source-neutral type of its own; Markdown structure travels as `markdown_block` structural evidence on each evidence unit.
- The application `useTripIntakeWorkflow` validates every extracted document through `validateUnifiedSourceDocument` before it becomes a prepared candidate. `PreparedMarkdownSource.document` is the branded `ValidatedUnifiedSourceDocument`, so unvalidated adapter output cannot reach interpretation, and a rejected document surfaces the bounded `source_document_invalid` failure.
- Evidence-unit IDs keep their `:block:` segment verbatim. They are frozen by the External Markdown Benchmark #001 mapping and by existing coverage fixtures; the ID is opaque downstream.
- `markdownSourceAdapter` must use a structure-aware parser or AST as its primary extraction boundary. It preserves hierarchy, source positions, links, assets, and unknown blocks; line-by-line regular expressions are not an acceptable primary parser.
- Extraction must not discard or flatten evidence early to fit `ParsedTripDraft` or `CanonicalTrip`. Semantic narrowing happens only after the complete `UnifiedSourceDocument` boundary.
- Regression fixtures must cover nested and multiline lists, tables, mixed Markdown syntax, and other structures whose meaning would be lost by line-oriented parsing.
- Raw input and `UnifiedSourceDocument` are session-only. Only confirmed CanonicalTrip may cross into durable trip persistence.

## Processing and recovery

- Application workflow state owns prepared/validated source, progress, failure, stage/overall deadlines, cancellation, and stale-result rejection, beginning before file reading or credential loading.
- The full-screen processing modal exposes `停止這次判讀` while accidental Escape/backdrop dismissal stays disabled. Stop, timeout and failure return to preserved-source recovery and do not change the confirmed trip. Selection also survives Review cancellation; successful confirmation and explicit local clearing discard the raw controls.
