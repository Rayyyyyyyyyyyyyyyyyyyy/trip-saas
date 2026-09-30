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

function itemsForUnit(unit: SourceEvidenceUnit): ReviewEvidenceItem[] {
  const tabular = tabularEvidenceOf(unit);
  const primary = excerptChunks(
    tabular ? unit.display_value || unit.raw_value : unit.raw_value,
  ).map((text): ReviewEvidenceItem =>
    tabular
      ? {
          kind: "tabular_excerpt",
          source_ref: unit.id,
          locator_label: unit.locator,
          sheet_name: tabular.sheet_name,
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
    .filter((link) => link.kind === "image")
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

  return {
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
          ? itemsForUnit(unit)
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
