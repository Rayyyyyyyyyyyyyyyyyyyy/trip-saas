import type {
  SourceEvidenceUnit,
  ValidatedUnifiedSourceDocument,
} from "../source/types";
import type { ParsedTripDraft, SupportingGroup } from "./types";

function sameGroup(
  left: SupportingGroup | null,
  right: SupportingGroup | null,
) {
  return (
    left?.id === right?.id &&
    left?.label === right?.label &&
    left?.order === right?.order
  );
}

function markdownGroup(
  unit: SourceEvidenceUnit,
  unitsById: Map<string, SourceEvidenceUnit>,
): SupportingGroup | null {
  let ancestorId = unit.parent_ref;
  while (ancestorId !== null) {
    const ancestor = unitsById.get(ancestorId);
    if (!ancestor) return null;
    const isHeading = ancestor.structural_evidence.some(
      (evidence) =>
        evidence.evidence_kind === "markdown_block" &&
        evidence.block_type === "heading",
    );
    if (isHeading) {
      const label = ancestor.display_value.trim();
      return label
        ? {
            id: `heading:${ancestor.id}`,
            label,
            order: ancestor.source_order,
          }
        : null;
    }
    ancestorId = ancestor.parent_ref;
  }
  return null;
}

function tabularGroup(unit: SourceEvidenceUnit): SupportingGroup | null {
  const candidates = unit.structural_evidence
    .filter((evidence) => evidence.evidence_kind === "tabular_region")
    .map((evidence): SupportingGroup => ({
      id: `sheet:${evidence.sheet_id}`,
      label: evidence.sheet_name,
      order: evidence.sheet_order,
    }));
  const first = candidates[0] ?? null;
  return first && candidates.every((candidate) => sameGroup(candidate, first))
    ? first
    : null;
}

function groupForUnit(
  unit: SourceEvidenceUnit,
  document: ValidatedUnifiedSourceDocument,
  unitsById: Map<string, SourceEvidenceUnit>,
) {
  return document.source_format === "tabular"
    ? tabularGroup(unit)
    : markdownGroup(unit, unitsById);
}

/**
 * Adds source-backed supporting groups after the provider response gates. The
 * provider never supplies group ids or labels; Review receives only this
 * cloned, deterministic draft.
 */
export function deriveSupportingGroups(
  draft: ParsedTripDraft,
  document: ValidatedUnifiedSourceDocument,
): ParsedTripDraft {
  const unitsById = new Map(
    document.evidence_units.map((unit) => [unit.id, unit]),
  );
  const candidate = structuredClone(draft);
  candidate.supporting_items = candidate.supporting_items.map((item) => {
    const groups = item.source_refs.map((sourceRef) => {
      const unit = unitsById.get(sourceRef);
      return unit ? groupForUnit(unit, document, unitsById) : null;
    });
    const first = groups[0] ?? null;
    const group =
      first !== null &&
      groups.every((candidateGroup) => sameGroup(candidateGroup, first))
        ? first
        : null;
    return { ...item, group };
  });
  return candidate;
}
