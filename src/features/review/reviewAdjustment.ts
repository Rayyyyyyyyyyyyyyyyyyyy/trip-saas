import type {
  ParsedTripDraft,
  SemanticInterpretationResult,
  TripTime,
} from "../../domain/trip/types";

const LOCAL_FIDELITY_FINDING_PREFIX = "finding:local-fidelity:";
const UNSUPPORTED_CLOCK_CODE = "AMBIGUOUS_CLOCK_PRECISION_INFERRED";
const UNSUPPORTED_CLOCK_KINDS = new Set(["exact", "approximate", "daypart"]);

export type UnsupportedClockPrecisionAdjustment = {
  id: string;
  kind: "unsupported_clock_precision_downgrade";
  finding_id: string;
  entity_id: string;
  source_refs: string[];
  before: TripTime;
  after: TripTime;
};

export type ReviewAdjustment = UnsupportedClockPrecisionAdjustment;

export type ReviewAdjustmentResult = {
  candidate: ParsedTripDraft;
  adjustments: ReviewAdjustment[];
};

function unresolvedFieldFor(time: TripTime) {
  return time.kind === "daypart" ? "time.daypart" : "time.start";
}

/**
 * The closed pre-Review recovery stage. It only accepts findings emitted by the
 * local source-fidelity validator and only removes unsupported clock precision.
 * The interpretation passed in is the recorded provider outcome and is never
 * mutated; callers keep it separately from this session-only candidate/result.
 */
export function applyConservativeReviewAdjustments(
  interpretation: SemanticInterpretationResult,
): ReviewAdjustmentResult {
  if (interpretation.status !== "draft" || !interpretation.draft) {
    throw new Error(
      "A draft interpretation is required for Review adjustment.",
    );
  }

  const candidate = structuredClone(interpretation.draft);
  const adjustments: ReviewAdjustment[] = [];
  const adjustedEntityIds = new Set<string>();

  for (const finding of interpretation.findings) {
    if (
      finding.code !== UNSUPPORTED_CLOCK_CODE ||
      !finding.id?.startsWith(LOCAL_FIDELITY_FINDING_PREFIX) ||
      finding.entity_refs?.length !== 1
    ) {
      continue;
    }

    const entityId = finding.entity_refs[0]!;
    const entity = candidate.entities.find((item) => item.id === entityId);
    if (
      !entity ||
      adjustedEntityIds.has(entityId) ||
      !UNSUPPORTED_CLOCK_KINDS.has(entity.time.kind) ||
      !entity.time.raw_text?.trim()
    ) {
      continue;
    }

    const before = structuredClone(entity.time);
    const after: TripTime = {
      kind: "none",
      start: null,
      end: null,
      daypart: null,
      raw_text: before.raw_text,
      crosses_midnight: false,
    };
    entity.time = after;
    entity.state.unresolved = true;
    entity.unresolved_fields = [
      ...new Set([...entity.unresolved_fields, unresolvedFieldFor(before)]),
    ];
    adjustedEntityIds.add(entityId);
    adjustments.push({
      id: `adjustment:unsupported-clock:${finding.id}`,
      kind: "unsupported_clock_precision_downgrade",
      finding_id: finding.id,
      entity_id: entityId,
      source_refs: [...new Set(finding.source_refs ?? entity.source_refs)],
      before,
      after: structuredClone(after),
    });
  }

  return { candidate, adjustments };
}
