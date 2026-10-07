import type { UnifiedSourceDocument } from "./types";

/** Whole sheets are indivisible: no cell, merge, or header context is cut. */
export function chunkSourceBySheet(
  source: UnifiedSourceDocument,
): UnifiedSourceDocument[] {
  if (source.source_format !== "tabular") return [source];
  const sheets = new Map<string, UnifiedSourceDocument["evidence_units"]>();
  for (const unit of source.evidence_units) {
    const evidence = unit.structural_evidence[0];
    if (evidence?.evidence_kind !== "tabular_region") return [source];
    const units = sheets.get(evidence.sheet_id) ?? [];
    units.push(unit);
    sheets.set(evidence.sheet_id, units);
  }
  return [...sheets.values()].map((units) => {
    const ids = new Set(units.map((unit) => unit.id));
    return {
      ...source,
      evidence_units: units.map((unit, index) => ({
        ...unit,
        source_order: index,
      })),
      extraction_findings: source.extraction_findings.filter((finding) =>
        ids.has(finding.evidence_unit_ref),
      ),
    };
  });
}
