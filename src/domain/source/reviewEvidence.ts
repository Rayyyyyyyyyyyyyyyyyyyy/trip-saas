import type {
  SourceEvidenceUnit,
  TabularStructuralEvidence,
  ValidatedUnifiedSourceDocument,
} from "./types";

/**
 * The fixed grammar Review uses to show why it believes something. Review
 * renders these items and nothing else: no evidence units, no structural
 * evidence, no Markdown AST, no workbook objects, no provider envelopes.
 *
 * Adding a source format adds a variant here and a case in the projection; it
 * does not change Review's components or the trip contracts.
 */

// Bound each presentation item, not the evidence available to the traveler.
// Long tables/paragraphs continue in subsequent excerpts with the same locator.
export const REVIEW_EXCERPT_MAX_CHARS = 4000;

export type ReviewEvidenceItem =
  | {
      kind: "text_excerpt";
      source_ref: string;
      locator_label: string;
      text: string;
      truncated: boolean;
    }
  | {
      kind: "tabular_excerpt";
      source_ref: string;
      locator_label: string;
      sheet_name: string;
      sheet_id: string;
      row_start: number;
      row_end: number;
      column_start: number;
      column_end: number;
      fragment_index: number;
      fragment_count: number;
      text: string;
      truncated: boolean;
    }
  | {
      kind: "asset_reference";
      source_ref: string;
      locator_label: string;
      label: string;
      target: string;
    }
  | {
      kind: "missing_reference";
      source_ref: string;
    }
  | { kind: "user_authored" };

/** Extraction findings, restated without the source envelope around them. */
export type ReviewEvidenceFinding = {
  code: string;
  message: string;
  severity: "warning" | "error";
  source_refs: string[];
};

export type ReviewEvidenceProjection = {
  findings: ReviewEvidenceFinding[];
  coverage_scope:
    | { kind: "source" }
    | { kind: "selected_sheets"; excluded_sheet_names: string[] };
  image_summary: {
    unimported_references: Array<{
      source_ref: string;
      locator_label: string;
      label: string;
      target: string;
    }>;
    workbook_inventory_unavailable: boolean;
  };
  itemsFor: (sourceRefs: readonly string[]) => ReviewEvidenceItem[];
};

function excerptChunks(value: string) {
  const chunks: string[] = [];
  let start = 0;
  while (start < value.length) {
    let end = Math.min(start + REVIEW_EXCERPT_MAX_CHARS, value.length);
    if (end < value.length) {
      // Prefer whole rows. Without a newline, avoid splitting a surrogate pair.
      const newline = value.lastIndexOf("\n", end - 1);
      if (newline >= start) end = newline + 1;
      else if (/^[\uDC00-\uDFFF]$/.test(value[end])) end -= 1;
    }
    chunks.push(value.slice(start, end));
    start = end;
  }
  return chunks.length > 0 ? chunks : [""];
}

function tabularEvidenceOf(
  unit: SourceEvidenceUnit,
): TabularStructuralEvidence | undefined {
  return unit.structural_evidence.find(
    (item): item is TabularStructuralEvidence =>
      item.evidence_kind === "tabular_region",
  );
}

function itemsForUnit(
  unit: SourceEvidenceUnit,
  missingAssets: Set<string>,
): ReviewEvidenceItem[] {
  const tabular = tabularEvidenceOf(unit);
  const chunks = excerptChunks(tabular ? unit.display_value : unit.raw_value);
  const primary = chunks.map((text, index): ReviewEvidenceItem =>
    tabular
      ? {
          kind: "tabular_excerpt",
          source_ref: unit.id,
          locator_label: unit.locator,
          sheet_name: tabular.sheet_name,
          sheet_id: tabular.sheet_id,
          row_start: tabular.row_start,
          row_end: tabular.row_end,
          column_start: tabular.column_start,
          column_end: tabular.column_end,
          fragment_index: index,
          fragment_count: chunks.length,
          text,
          truncated: false,
        }
      : {
          kind: "text_excerpt",
          source_ref: unit.id,
          locator_label: unit.locator,
          text,
          truncated: false,
        },
  );

  // Images are evidence in their own right: a Review finding about a missing
  // ticket photo must be able to name the asset, not only the prose near it.
  const assets = unit.links
    .filter(
      (link) =>
        link.kind === "image" &&
        !missingAssets.has(JSON.stringify([unit.id, link.target])),
    )
    .map((link): ReviewEvidenceItem => ({
      kind: "asset_reference",
      source_ref: unit.id,
      locator_label: unit.locator,
      label: link.label,
      target: link.target,
    }));

  return [...primary, ...assets];
}

export function createReviewEvidenceProjection(
  document: ValidatedUnifiedSourceDocument,
): ReviewEvidenceProjection {
  const unitsById = new Map(
    document.evidence_units.map((unit) => [unit.id, unit]),
  );
  const missingAssets = new Set<string>();
  const unimportedReferences: ReviewEvidenceProjection["image_summary"]["unimported_references"] =
    [];
  for (const finding of document.extraction_findings) {
    if (finding.code !== "MISSING_RELATIVE_ASSET") continue;
    const identity = JSON.stringify([
      finding.evidence_unit_ref,
      finding.target,
    ]);
    if (missingAssets.has(identity)) continue;
    missingAssets.add(identity);
    const unit = unitsById.get(finding.evidence_unit_ref);
    const link = unit?.links.find(
      (item) => item.kind === "image" && item.target === finding.target,
    );
    unimportedReferences.push({
      source_ref: finding.evidence_unit_ref,
      locator_label: finding.locator,
      label: link?.label ?? "",
      target: finding.target,
    });
  }

  return {
    coverage_scope:
      document.source_format === "tabular"
        ? {
            kind: "selected_sheets",
            excluded_sheet_names: [...(document.excluded_sheets ?? [])],
          }
        : { kind: "source" },
    image_summary: {
      unimported_references: unimportedReferences,
      workbook_inventory_unavailable:
        document.source_format === "tabular" &&
        document.input_mode !== "csv_file",
    },
    findings: document.extraction_findings.map((finding) => ({
      code: finding.code,
      message: finding.message,
      severity: finding.severity,
      source_refs: [finding.evidence_unit_ref],
    })),
    itemsFor: (sourceRefs) => {
      // No reference at all means the user authored this during Review. That
      // is a different statement from "the reference is broken", so it gets
      // its own variant rather than an empty list.
      if (sourceRefs.length === 0) return [{ kind: "user_authored" }];
      const seen = new Set<string>();
      const append = (sourceRef: string): ReviewEvidenceItem[] => {
        if (seen.has(sourceRef)) return [];
        seen.add(sourceRef);
        const unit = unitsById.get(sourceRef);
        return unit
          ? itemsForUnit(unit, missingAssets)
          : [{ kind: "missing_reference", source_ref: sourceRef }];
      };
      return sourceRefs.flatMap((sourceRef) => {
        const unit = unitsById.get(sourceRef);
        // One explicit parent and header provide bounded surrounding context;
        // do not recursively expand the source hierarchy into each finding.
        const contextRefs = unit
          ? [unit.parent_ref, tabularEvidenceOf(unit)?.header_ref].filter(
              (ref): ref is string => typeof ref === "string",
            )
          : [];
        return [...contextRefs.flatMap(append), ...append(sourceRef)];
      });
    },
  };
}
