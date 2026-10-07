import type { UnifiedSourceDocument, TabularStructuralEvidence } from "./types";

function columnLabel(column: number) {
  let value = column;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

function coordinates(evidence: TabularStructuralEvidence) {
  const start = `${columnLabel(evidence.column_start)}${evidence.row_start}`;
  const end = `${columnLabel(evidence.column_end)}${evidence.row_end}`;
  return start === end ? start : `${start}:${end}`;
}

/** Structural integrity only: no itinerary/header meaning is inferred here. */
export function tabularEvidenceIsValid(
  document: UnifiedSourceDocument,
): boolean {
  const sheets = new Map<string, { name: string; order: number }>();
  const orders = new Map<number, string>();
  const unitsById = new Map(
    document.evidence_units.map((unit) => [unit.id, unit]),
  );
  let previous: TabularStructuralEvidence | undefined;
  let activeRegions: Array<{
    id: string;
    evidence: TabularStructuralEvidence;
  }> = [];
  for (const unit of document.evidence_units) {
    if (unit.structural_evidence.length !== 1) return false;
    const evidence = unit.structural_evidence[0]!;
    if (evidence.evidence_kind !== "tabular_region") return false;
    if (
      evidence.row_start > evidence.row_end ||
      evidence.column_start > evidence.column_end ||
      evidence.row_end > 1_048_576 ||
      evidence.column_end > 16_384
    )
      return false;
    const range = coordinates(evidence);
    if (unit.locator !== `sheet:${evidence.sheet_name}!${range}`) return false;
    const isMerge =
      evidence.row_start !== evidence.row_end ||
      evidence.column_start !== evidence.column_end;
    const mergeParent =
      !isMerge && evidence.merge_ref !== null
        ? unitsById.get(unit.parent_ref ?? "")
        : undefined;
    const parentEvidence = mergeParent?.structural_evidence[0];
    const coveredChild =
      !!mergeParent &&
      mergeParent.source_order < unit.source_order &&
      mergeParent.locator === evidence.merge_ref &&
      parentEvidence?.evidence_kind === "tabular_region" &&
      parentEvidence.sheet_id === evidence.sheet_id &&
      parentEvidence.merge_ref === mergeParent.locator &&
      (parentEvidence.row_start !== parentEvidence.row_end ||
        parentEvidence.column_start !== parentEvidence.column_end) &&
      parentEvidence.row_start <= evidence.row_start &&
      parentEvidence.row_end >= evidence.row_end &&
      parentEvidence.column_start <= evidence.column_start &&
      parentEvidence.column_end >= evidence.column_end;
    if (
      isMerge
        ? evidence.merge_ref !== unit.locator
        : evidence.merge_ref !== null && !coveredChild
    )
      return false;
    const sheet = sheets.get(evidence.sheet_id);
    if (
      sheet &&
      (sheet.name !== evidence.sheet_name ||
        sheet.order !== evidence.sheet_order)
    )
      return false;
    if (
      orders.has(evidence.sheet_order) &&
      orders.get(evidence.sheet_order) !== evidence.sheet_id
    )
      return false;
    sheets.set(evidence.sheet_id, {
      name: evidence.sheet_name,
      order: evidence.sheet_order,
    });
    orders.set(evidence.sheet_order, evidence.sheet_id);
    if (
      sheets.size > 19 ||
      document.excluded_sheets?.includes(evidence.sheet_name)
    )
      return false;
    if (previous) {
      if (evidence.sheet_order < previous.sheet_order) return false;
      if (
        evidence.sheet_id === previous.sheet_id &&
        (evidence.row_start < previous.row_start ||
          (evidence.row_start === previous.row_start &&
            evidence.column_start <= previous.column_start))
      )
        return false;
    }
    activeRegions =
      evidence.sheet_id === previous?.sheet_id
        ? activeRegions.filter(
            (region) => region.evidence.row_end >= evidence.row_start,
          )
        : [];
    if (
      activeRegions.some(
        (region) =>
          region.evidence.column_start <= evidence.column_end &&
          evidence.column_start <= region.evidence.column_end &&
          !(coveredChild && region.id === mergeParent!.id),
      )
    )
      return false;
    activeRegions.push({ id: unit.id, evidence });
    if (evidence.header_ref !== null) {
      const header = unitsById.get(evidence.header_ref);
      const headerEvidence = header?.structural_evidence[0];
      if (
        !header ||
        header.source_order >= unit.source_order ||
        headerEvidence?.evidence_kind !== "tabular_region" ||
        headerEvidence.sheet_id !== evidence.sheet_id
      )
        return false;
    }
    previous = evidence;
  }
  return true;
}
