import type { ReviewEvidenceProjection } from "../../domain/source/reviewEvidence";
import type { SemanticInterpretationResult } from "../../domain/trip/types";
import {
  isPreservationFinding,
  preservationFindingState,
  type ReviewFindingContext,
} from "./reviewPreservation";
import { validateParsedTripDraft } from "../../domain/trip/validateParsedTripDraft";
import type {
  Coverage,
  DraftEntity,
  ParsedTripDraft,
  TripFinding,
} from "../../domain/trip/types";

const copy = <T>(value: T): T => structuredClone(value);

/**
 * Candidate rules with a deterministic validator in this repository. Parser
 * copies of these findings are snapshots: the current validator result owns
 * whether they remain visible and blocking after a correction.
 */
const REVALIDATED_FINDING_CODES = new Set([
  "SCHEMA_INVALID",
  "DUPLICATE_ID",
  "DUPLICATE_DAY_SOURCE_ORDER",
  "UNKNOWN_DAY_REFERENCE",
  "TIME_SHAPE_INVALID",
  "CROSS_MIDNIGHT_INVALID",
  "TIME_RANGE_REVERSED",
  "TRIP_DATE_INVALID",
  "TRIP_RANGE_REVERSED",
  "DAY_DATE_INVALID",
  "DAY_OUTSIDE_TRIP_RANGE",
  "UNKNOWN_ENTITY_REFERENCE",
  "SELF_RELATIONSHIP",
  "RELATIONSHIP_MEMBERS_MISSING",
  "CONDITIONAL_RELATIONSHIP_INCOMPLETE",
  "PARENT_CHILD_INCOMPLETE",
  "DUPLICATE_ENTITY_CANDIDATE",
  "DEPENDENCY_ID_CONFLICT",
]);

const USER_RESOLVED_FINDING_CODE = "USER_RESOLVED_FINDING";
const LOCAL_ASSET_CODES = new Set(["MISSING_ASSET", "MISSING_RELATIVE_ASSET"]);

function findingIdentity(finding: TripFinding) {
  return JSON.stringify([
    finding.id ?? null,
    finding.code,
    finding.message,
    [...(finding.refs ?? [])].sort(),
    [...(finding.entity_refs ?? [])].sort(),
    [...(finding.source_refs ?? [])].sort(),
  ]);
}

function hashIdentity(value: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(36)}:${(second >>> 0).toString(36)}`;
}

export function reviewFindingResolutionId(finding: TripFinding) {
  return `finding:user-resolution:${hashIdentity(findingIdentity(finding))}`;
}

export function isMechanicallyRevalidatedFinding(finding: TripFinding) {
  return (
    REVALIDATED_FINDING_CODES.has(finding.code) ||
    isPreservationFinding(finding)
  );
}

export type ReviewEntityFieldPath =
  | "title"
  | "day_id"
  | "semantic_type"
  | "place.name"
  | "place.address"
  | "notes"
  | "time"
  | "time.kind"
  | "time.start"
  | "time.end"
  | "time.daypart"
  | "time.raw_text"
  | "time.crosses_midnight"
  | "state"
  | "state.optional"
  | "state.tentative"
  | "state.flexible";

function uniqueFindings(findings: TripFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = JSON.stringify([
      finding.code,
      finding.message,
      finding.blocking,
      finding.refs ?? [],
      finding.entity_refs ?? [],
      finding.source_refs ?? [],
    ]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function deriveReviewFindings(
  draft: ParsedTripDraft,
  interpretationFindings: TripFinding[] = [],
  context?: ReviewFindingContext,
): TripFinding[] {
  const draftValidation = validateParsedTripDraft(draft);
  const confidenceFindings = draft.entities
    .filter((entity) => entity.confidence === "low")
    .map((entity): TripFinding => ({
      blocking: false,
      code: "LOW_CONFIDENCE_INTERPRETATION",
      entity_refs: [entity.id],
      message: `「${entity.title}」的判讀把握較低，請對照原文確認。`,
      severity: "warning",
      source_refs: entity.source_refs,
    }));
  const overrideFindings = draft.entities
    .filter((entity) => entity.provenance.origin === "user")
    .map((entity): TripFinding => ({
      blocking: false,
      code: "USER_OVERRIDE",
      entity_refs: [entity.id],
      message:
        entity.provenance.overridden_fields.length > 0
          ? `已保留你的修改：${entity.provenance.overridden_fields.join("、")}`
          : "這是你新增的行程內容。",
      severity: "info",
      source_refs: entity.source_refs,
    }));
  const resolvedFindingIds = new Set(
    draft.findings
      .filter((finding) => finding.code === USER_RESOLVED_FINDING_CODE)
      .map((finding) => finding.id),
  );
  const unresolvedMaterialFindings = [
    ...interpretationFindings,
    ...draft.findings,
  ]
    .filter(
      (finding) =>
        !REVALIDATED_FINDING_CODES.has(finding.code) &&
        (isPreservationFinding(finding) ||
          !resolvedFindingIds.has(reviewFindingResolutionId(finding))),
    )
    .map((finding): TripFinding => {
      if (!isPreservationFinding(finding)) {
        const localAsset =
          LOCAL_ASSET_CODES.has(finding.code) &&
          context?.evidence.findings.some(
            (item) =>
              LOCAL_ASSET_CODES.has(item.code) &&
              item.severity === "warning" &&
              (finding.source_refs?.length ?? 0) > 0 &&
              [...new Set(item.source_refs)].sort().join("\n") ===
                [...new Set(finding.source_refs)].sort().join("\n"),
          );
        return localAsset ? { ...finding, blocking: false } : finding;
      }
      const state = preservationFindingState(
        draft,
        finding,
        context,
        draftValidation.valid,
      );
      if (state === "corrected")
        return {
          ...finding,
          code: "USER_CORRECTED_FINDING",
          message: `已依你的修改重新檢查：${finding.code} · ${finding.message}`,
          blocking: false,
          severity: "info",
        };
      return { ...finding, blocking: state === "blocking" };
    });

  return uniqueFindings([
    ...unresolvedMaterialFindings,
    ...draftValidation.findings,
    ...confidenceFindings,
    ...overrideFindings,
  ]);
}

export function deriveReviewSessionFindings(
  draft: ParsedTripDraft,
  interpretation: SemanticInterpretationResult,
  evidence: ReviewEvidenceProjection,
  corrections: ReviewFindingContext["corrections"] = [],
) {
  return deriveReviewFindings(
    draft,
    [
      ...interpretation.findings,
      ...deriveUnparsedItemFindings(interpretation.coverage.unparsed_items),
      ...evidence.findings.map((finding) => ({
        ...finding,
        blocking: finding.severity === "error",
      })),
    ],
    { evidence, corrections },
  );
}

export function resolveReviewFinding(
  draft: ParsedTripDraft,
  finding: TripFinding,
) {
  if (!finding.blocking || isMechanicallyRevalidatedFinding(finding)) {
    return copy(draft);
  }

  const next = copy(draft);
  const id = reviewFindingResolutionId(finding);
  if (next.findings.some((candidate) => candidate.id === id)) return next;

  const referencedEntitySourceRefs = next.entities
    .filter((entity) => finding.entity_refs?.includes(entity.id))
    .flatMap((entity) => entity.source_refs);
  const sourceRefs = [
    ...(finding.source_refs ?? []),
    ...referencedEntitySourceRefs,
    ...next.trip.source_refs,
  ];

  next.findings.push({
    id,
    severity: "info",
    code: USER_RESOLVED_FINDING_CODE,
    message: `你已對照原文確認：${finding.code} · ${finding.message}`,
    blocking: false,
    entity_refs: [...new Set(finding.entity_refs ?? [])],
    source_refs: [...new Set(sourceRefs)],
  });
  return next;
}

export function deriveUnparsedItemFindings(
  items: Coverage["unparsed_items"],
): TripFinding[] {
  return items.map((item) => ({
    blocking: item.severity === "error",
    code: item.reason_code,
    message: item.message,
    severity: item.severity,
    source_refs: [item.source_ref],
  }));
}

export function editReviewTrip(
  draft: ParsedTripDraft,
  patch: Partial<ParsedTripDraft["trip"]>,
) {
  const next = copy(draft);
  next.trip = { ...next.trip, ...patch };
  return next;
}

export function editReviewDay(
  draft: ParsedTripDraft,
  dayId: string,
  patch: Partial<ParsedTripDraft["days"][number]>,
) {
  const next = copy(draft);
  next.days = next.days.map((day) =>
    day.id === dayId ? { ...day, ...patch } : day,
  );
  return next;
}

export function editReviewEntity(
  draft: ParsedTripDraft,
  entityId: string,
  overriddenField: ReviewEntityFieldPath,
  edit: (entity: DraftEntity) => void,
) {
  const next = copy(draft);
  const entity = next.entities.find((candidate) => candidate.id === entityId);
  if (!entity) return next;
  edit(entity);
  entity.provenance.origin = "user";
  entity.provenance.overridden_fields = [
    ...new Set([...entity.provenance.overridden_fields, overriddenField]),
  ];
  return next;
}

export function createUserAuthoredEntity(
  dayId: string | null,
  id: string = `entity:user:${crypto.randomUUID()}`,
): DraftEntity {
  return {
    actions: [],
    confidence: "high",
    day_id: dayId,
    id,
    notes: [],
    place: {
      address: null,
      name: null,
      raw_text: null,
      unresolved: false,
      url: null,
    },
    provenance: { origin: "user", overridden_fields: [] },
    raw_label: null,
    readiness: null,
    reservation: null,
    semantic_type: "activity",
    source_refs: [],
    state: {
      flexible: false,
      optional: false,
      tentative: false,
      unresolved: false,
    },
    ticket: null,
    time: {
      crosses_midnight: false,
      daypart: null,
      end: null,
      kind: "none",
      raw_text: null,
      start: null,
    },
    title: "新增行程",
    unresolved_fields: [],
  };
}

export function addMissedEntity(
  draft: ParsedTripDraft,
  dayId: string | null,
  id?: string,
) {
  const next = copy(draft);
  next.entities.push(createUserAuthoredEntity(dayId, id));
  return next;
}

export function deleteFalseEntity(draft: ParsedTripDraft, entityId: string) {
  const next = copy(draft);
  next.entities = next.entities.filter((entity) => entity.id !== entityId);
  return next;
}

export function revertEntityCorrection(
  draft: ParsedTripDraft,
  originalDraft: ParsedTripDraft,
  entityId: string,
) {
  const original = originalDraft.entities.find(
    (entity) => entity.id === entityId,
  );
  if (!original) return deleteFalseEntity(draft, entityId);
  const next = copy(draft);
  next.entities = next.entities.map((entity) =>
    entity.id === entityId ? copy(original) : entity,
  );
  return next;
}
