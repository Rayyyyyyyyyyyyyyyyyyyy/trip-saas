import type { SemanticInterpretationResult, TripFinding } from "../trip/types";
import type { ValidatedUnifiedSourceDocument } from "./types";
import { assessTabularDateSupport } from "./assessTabularDateSupport";
import { hasAmbiguousClockExpression } from "./clockExpression";

function finding(
  code: string,
  message: string,
  entityRefs: string[],
  sourceRefs: string[],
): TripFinding {
  const identity = `${code}|${message}|${entityRefs.join(",")}|${sourceRefs.join(",")}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < identity.length; index += 1)
    hash = Math.imul(hash ^ identity.charCodeAt(index), 0x01000193);
  return {
    id: `finding:local-fidelity:${code.toLowerCase()}:${(hash >>> 0).toString(36)}`,
    severity: "review",
    code,
    message,
    blocking: true,
    entity_refs: entityRefs,
    source_refs: sourceRefs,
  };
}

/**
 * Necessary source-support checks. They expose demonstrated fidelity defects;
 * passing them is not proof that the whole interpretation is faithful.
 */
export function validateInterpretationFidelity(
  result: SemanticInterpretationResult,
  source: ValidatedUnifiedSourceDocument,
): TripFinding[] {
  if (result.status !== "draft" || !result.draft) return [];

  const findings: TripFinding[] = [];
  const unitById = new Map(
    source.evidence_units.map((unit) => [unit.id, unit]),
  );
  const dayStarts = (
    source.source_format === "markdown" ? [...result.draft.days] : []
  )
    .sort((left, right) => left.source_order - right.source_order)
    .map((day) => ({
      day,
      sourceOrder: Math.min(
        ...day.source_refs
          .map((ref) => unitById.get(ref)?.source_order)
          .filter((order): order is number => order !== undefined),
      ),
    }))
    .filter((item) => Number.isFinite(item.sourceOrder));
  for (const entity of result.draft.entities) {
    if (entity.day_id === null) continue;
    const dayIndex = dayStarts.findIndex(
      (item) => item.day.id === entity.day_id,
    );
    if (dayIndex < 0) continue;
    const start = dayStarts[dayIndex].sourceOrder;
    const end =
      dayStarts[dayIndex + 1]?.sourceOrder ?? Number.POSITIVE_INFINITY;
    const hasSourceSupport = entity.source_refs.some((ref) => {
      const order = unitById.get(ref)?.source_order;
      return order !== undefined && order >= start && order < end;
    });
    if (!hasSourceSupport) {
      findings.push(
        finding(
          "DAY_BINDING_NOT_SOURCE_SUPPORTED",
          `「${entity.title}」的日期歸屬沒有對應來源區段，請保留為未指定日期或對照原文修正。`,
          [entity.id],
          entity.source_refs,
        ),
      );
    }
  }

  for (const entity of result.draft.entities) {
    if (
      entity.time.raw_text &&
      ["exact", "approximate", "daypart"].includes(entity.time.kind) &&
      hasAmbiguousClockExpression(
        entity.time.raw_text,
        entity.source_refs.flatMap((ref) => {
          const unit = unitById.get(ref);
          return unit
            ? [
                source.source_format === "tabular"
                  ? unit.display_value
                  : unit.raw_value,
              ]
            : [];
        }),
      )
    ) {
      findings.push(
        finding(
          "AMBIGUOUS_CLOCK_PRECISION_INFERRED",
          `「${entity.time.raw_text}」沒有足夠的 24 小時制精度，請保留原文且不要推斷時段。`,
          [entity.id],
          entity.source_refs,
        ),
      );
    }
  }

  findings.push(...assessTabularDateSupport(result.draft, source).findings);
  return findings;
}
