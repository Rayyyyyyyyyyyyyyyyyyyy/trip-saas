import type {
  ParsedTripDraft,
  SemanticInterpretationResult,
  TripTime,
} from "../../domain/trip/types";
import type { TabularDateDecision } from "../../domain/source/assessTabularDateSupport";

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

export type UnsupportedDateYearAdjustment = {
  id: string;
  kind: "unsupported_date_year_downgrade";
  finding_id: string;
  target: TabularDateDecision["target"];
  source_refs: string[];
  before: string;
  after: null;
  partial_text: string | null;
};
export type ReviewAdjustment =
  UnsupportedClockPrecisionAdjustment | UnsupportedDateYearAdjustment;

export type ReviewAdjustmentResult = {
  candidate: ParsedTripDraft;
  adjustments: ReviewAdjustment[];
};

function unresolvedFieldFor(time: TripTime) {
  return time.kind === "daypart" ? "time.daypart" : "time.start";
}

/**
 * The closed pre-Review recovery stage. It only accepts findings emitted by the
 * local source-fidelity validator and removes unsupported clock/date precision.
 * The interpretation passed in is the recorded provider outcome and is never
 * mutated; callers keep it separately from this session-only candidate/result.
 */
export function applyConservativeReviewAdjustments(
  interpretation: SemanticInterpretationResult,
  dateDecisions: readonly TabularDateDecision[] = [],
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

  const knownIds = new Set([
    candidate.trip.id,
    ...candidate.days.map((item) => item.id),
    ...candidate.entities.map((item) => item.id),
    ...candidate.relationships.map((item) => item.id),
    ...candidate.supporting_items.map((item) => item.id),
    ...candidate.findings.map((item) => item.id),
  ]);
  for (const decision of dateDecisions) {
    const localFinding = interpretation.findings.find(
      (item) =>
        item.id === decision.finding_id &&
        item.code === "MISSING_YEAR" &&
        item.id?.startsWith(LOCAL_FIDELITY_FINDING_PREFIX) &&
        JSON.stringify(item.source_refs) ===
          JSON.stringify(decision.source_refs),
    );
    if (!localFinding) continue;
    if (decision.target.kind === "trip") {
      if (
        candidate.trip[decision.target.field] !== decision.before ||
        JSON.stringify(candidate.trip.source_refs) !==
          JSON.stringify(decision.source_refs)
      )
        continue;
      candidate.trip[decision.target.field] = null;
      if (
        decision.partial_text &&
        !candidate.supporting_items.some(
          (item) => item.text === decision.partial_text,
        )
      ) {
        let suffix = 0;
        let id = `supporting:partial-date:${suffix}`;
        while (knownIds.has(id)) id = `supporting:partial-date:${++suffix}`;
        knownIds.add(id);
        candidate.supporting_items.push({
          id,
          kind: "note",
          text: decision.partial_text,
          url: null,
          unresolved: true,
          source_refs: [...decision.source_refs],
        });
      }
    } else {
      const day = candidate.days.find(
        (item) =>
          item.id ===
          (decision.target.kind === "day" ? decision.target.day_id : ""),
      );
      if (
        !day ||
        day.date !== decision.before ||
        JSON.stringify(day.source_refs) !== JSON.stringify(decision.source_refs)
      )
        continue;
      day.date = null;
      const year = decision.before.slice(0, 4);
      const retainedLabel = day.label
        ?.replaceAll(decision.before, "")
        .replace(new RegExp(`(?<![0-9])${year}(?![0-9])年?`, "gu"), "")
        .trim();
      if (!decision.partial_text) day.label = retainedLabel || null;
      else if (!retainedLabel || decision.partial_text.includes(retainedLabel))
        day.label = decision.partial_text;
      else if (retainedLabel.includes(decision.partial_text))
        day.label = retainedLabel;
      else day.label = `${retainedLabel} · ${decision.partial_text}`;
    }
    adjustments.push({
      id: `adjustment:unsupported-year:${decision.finding_id}`,
      kind: "unsupported_date_year_downgrade",
      finding_id: decision.finding_id,
      target: decision.target,
      source_refs: [...decision.source_refs],
      before: decision.before,
      after: null,
      partial_text: decision.partial_text,
    });
  }
  return { candidate, adjustments };
}
