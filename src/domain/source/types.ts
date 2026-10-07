/**
 * Source-neutral document contract shared by every Source Adapter.
 *
 * These types are the TypeScript projection of
 * `schemas/unified-source-document.v1.schema.json`. The schema stays
 * authoritative: a shape that only satisfies the types is not an
 * interpretation input until `validateUnifiedSourceDocument` brands it.
 */

export type SourceFormat = "markdown" | "tabular";

export type SourceLink = {
  kind: "link" | "image";
  label: string;
  target: string;
};

/** Markdown structural signals. One extracted block is one evidence unit. */
export type MarkdownStructuralEvidence = {
  evidence_kind: "markdown_block";
  block_type:
    | "blockquote"
    | "code"
    | "heading"
    | "list_item"
    | "paragraph"
    | "table"
    | "thematic_break";
  depth: number;
  line_start: number;
  line_end: number;
  heading_level?: number;
  list_marker?: string;
  sequence_like?: boolean;
  table_column_count?: number;
  table_row_count?: number;
};

/**
 * Tabular structural evidence consumed by the Spreadsheet Source Adapter —
 * sheet identity/order, region locator, row/column position, merge and header
 * relationships, cached value, formula, and hyperlink evidence.
 */
export type TabularStructuralEvidence = {
  evidence_kind: "tabular_region";
  sheet_id: string;
  sheet_name: string;
  sheet_order: number;
  row_start: number;
  row_end: number;
  column_start: number;
  column_end: number;
  header_ref: string | null;
  merge_ref: string | null;
  cached_display_value?: string;
  formula?: string;
  hyperlink_target?: string;
  typed_hint?:
    | { kind: "number"; value: number }
    | { kind: "boolean"; value: boolean }
    | { kind: "date_serial"; value: number; date_system: "1900" | "1904" };
};

export type SourceStructuralEvidence =
  MarkdownStructuralEvidence | TabularStructuralEvidence;

export type SourceEvidenceUnit = {
  id: string;
  source_order: number;
  parent_ref: string | null;
  locator: string;
  raw_value: string;
  display_value: string;
  links: SourceLink[];
  structural_evidence: SourceStructuralEvidence[];
};

export type SourceExtractionFinding = {
  code:
    | "MISSING_RELATIVE_ASSET"
    | "MISSING_CACHED_VALUE"
    | "CACHED_VALUE_ERROR"
    | "COVERED_CELL_CONTENT";
  severity: "warning" | "error";
  message: string;
  evidence_unit_ref: string;
  locator: string;
  target: string;
};

export type UnifiedSourceDocument = {
  schema_version: "unified-source-document.v1";
  source_id: string;
  display_name: string;
  input_mode:
    "markdown_file" | "pasted_markdown" | "spreadsheet_file" | "csv_file";
  source_format: SourceFormat;
  evidence_units: SourceEvidenceUnit[];
  extraction_findings: SourceExtractionFinding[];
  /** User-excluded visible sheets only. Hidden sheets are never included. */
  excluded_sheets?: string[];
};

declare const validatedSourceDocument: unique symbol;

/**
 * A `UnifiedSourceDocument` that passed schema and deterministic integrity
 * validation. The brand is unforgeable outside this module, so an adapter
 * cannot hand an unvalidated document to the interpretation interface.
 */
export type ValidatedUnifiedSourceDocument = UnifiedSourceDocument & {
  readonly [validatedSourceDocument]: true;
};
