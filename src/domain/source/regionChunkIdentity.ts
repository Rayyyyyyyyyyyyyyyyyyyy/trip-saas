import type { InterpretationChunkPlan } from "./planSourceChunks";
import type { ValidatedUnifiedSourceDocument } from "./types";

/** Only a single visible calendar expression provides a continuation anchor. */
export function specificDateAnchor(
  sourceRefs: readonly string[],
  source: ValidatedUnifiedSourceDocument,
) {
  const hidden = new Set(
    source.extraction_findings
      .filter((item) => item.code === "COVERED_CELL_CONTENT")
      .map((item) => item.evidence_unit_ref),
  );
  const anchors = source.evidence_units.filter((unit) => {
    if (!sourceRefs.includes(unit.id) || hidden.has(unit.id)) return false;
    const evidence = unit.structural_evidence[0];
    if (evidence?.evidence_kind !== "tabular_region") return false;
    const expressions = [
      ...unit.display_value.matchAll(
        /(?<!\d)(?:\d{4}[-/.](?:1[0-2]|0?[1-9])[-/.](?:3[01]|[12]\d|0?[1-9])|(?:\d{4}年)?(?:1[0-2]|0?[1-9])[/月](?:3[01]|[12]\d|0?[1-9])(?:日|號)?)(?!\d)/gu,
      ),
    ];
    if (expressions.length !== 1) return false;
    const parts =
      /^(?:(\d{4})[-/.年])?(\d{1,2})[-/.月](\d{1,2})(?:日|號)?$/u.exec(
        expressions[0]![0],
      );
    if (!parts) return false;
    // Leap year 2000 is only a validity probe for a yearless month/day; it is
    // never returned, inferred for the trip, or written into source evidence.
    const year = parts[1] ? Number(parts[1]) : 2000;
    const month = Number(parts[2]);
    const day = Number(parts[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  });
  return anchors.length === 1 ? anchors[0]!.id : null;
}

export function regionChunkBoundaryRefs(
  plans: readonly InterpretationChunkPlan[],
  source: ValidatedUnifiedSourceDocument,
) {
  const boundaryRefs: string[] = [];
  const lastBySheet = new Map<string, string>();
  for (const plan of plans) {
    const owned = source.evidence_units.filter((unit) =>
      plan.ownedIds.includes(unit.id),
    );
    const first = owned[0];
    const last = owned.at(-1);
    const evidence = first?.structural_evidence[0];
    if (!first || !last || evidence?.evidence_kind !== "tabular_region")
      continue;
    const previous = lastBySheet.get(evidence.sheet_id);
    if (previous) boundaryRefs.push(previous, first.id);
    lastBySheet.set(evidence.sheet_id, last.id);
  }
  return [...new Set(boundaryRefs)];
}
