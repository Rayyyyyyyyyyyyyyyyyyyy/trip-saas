import type { ReviewEvidenceProjection } from "../../domain/source/reviewEvidence";
import { clockExpressionsIn } from "../../domain/source/clockExpression";
import type {
  ParsedTripDraft,
  TripFinding,
  TripTime,
} from "../../domain/trip/types";

export type ReviewEditTarget =
  | { kind: "trip"; field: "start_date" | "end_date" }
  | { kind: "day"; id: string; field: "date" | "label" }
  | { kind: "entity"; id: string; field: "time" }
  | { kind: "delete_entity"; id: string }
  | { kind: "revert_entity"; id: string };

/** Trusted UI edits, kept outside provider/Draft/Canonical schemas and storage. */
export type ReviewCorrection = {
  target: Exclude<ReviewEditTarget, { kind: "revert_entity" }>;
  value: string | null | TripTime;
  source_refs: string[];
  time_fields?: readonly ("start" | "end" | "daypart" | "crosses_midnight")[];
};
export type ReviewFindingContext = {
  evidence: ReviewEvidenceProjection;
  corrections?: readonly ReviewCorrection[];
};

const CLOCK_CODES = new Set([
  "AMBIGUOUS_CLOCK",
  "AMBIGUOUS_CLOCK_FORMAT",
  "AMBIGUOUS_TIME",
  "AMBIGUOUS_TIME_MERIDIEM",
  "AMBIGUOUS_CLOCK_PRECISION_INFERRED",
]);
const YEAR_CODES = new Set(["MISSING_TRIP_YEAR", "MISSING_YEAR"]);
export const isPreservationFinding = (finding: TripFinding) =>
  CLOCK_CODES.has(finding.code) || YEAR_CODES.has(finding.code);

function targetValue(
  draft: ParsedTripDraft,
  target: ReviewCorrection["target"],
) {
  if (target.kind === "trip")
    return {
      value: draft.trip[target.field],
      source_refs: draft.trip.source_refs,
    };
  if (target.kind === "day") {
    const day = draft.days.find((item) => item.id === target.id);
    return day && { value: day[target.field], source_refs: day.source_refs };
  }
  const entity = draft.entities.find((item) => item.id === target.id);
  if (target.kind === "delete_entity")
    return entity ? undefined : { value: null, source_refs: [] };
  return entity && { value: entity.time, source_refs: entity.source_refs };
}
const same = (left: unknown, right: unknown) =>
  JSON.stringify(left) === JSON.stringify(right);

export function recordReviewCorrection(
  previous: ParsedTripDraft,
  next: ParsedTripDraft,
  corrections: readonly ReviewCorrection[] = [],
  edit?: ReviewEditTarget,
): ReviewCorrection[] {
  const retained = corrections.filter((correction) => {
    const target = correction.target;
    if (target.kind === "delete_entity")
      return !next.entities.some((entity) => entity.id === target.id);
    if (
      edit?.kind === "revert_entity" &&
      correction.target.kind === "entity" &&
      correction.target.id === edit.id
    )
      return false;
    const current = targetValue(next, correction.target);
    return (
      current &&
      same(current, {
        value: correction.value,
        source_refs: correction.source_refs,
      })
    );
  });
  if (!edit || edit.kind === "revert_entity") return retained;
  if (edit.kind === "delete_entity") {
    const removed = previous.entities.find((entity) => entity.id === edit.id);
    if (!removed || next.entities.some((entity) => entity.id === edit.id))
      return retained;
    return [
      ...retained.filter((item) => !same(item.target, edit)),
      {
        target: { ...edit },
        value: null,
        source_refs: [...removed.source_refs],
      },
    ];
  }
  const before = targetValue(previous, edit);
  const after = targetValue(next, edit);
  if (!after || same(before, after)) return retained;
  let timeFields: ReviewCorrection["time_fields"];
  if (edit.kind === "entity") {
    const priorTime = before?.value as TripTime | undefined;
    const currentTime = after.value as TripTime;
    const fields = ["start", "end", "daypart", "crosses_midnight"] as const;
    const edited = fields.filter(
      (field) => !same(priorTime?.[field], currentTime[field]),
    );
    // Repairing raw source text, or changing only the precision label, does not
    // authorize an unchanged inferred start/end/daypart.
    if (!edited.length) return retained;
    const prior = corrections.find(
      (item) =>
        same(item.target, edit) &&
        same(before, {
          value: item.value,
          source_refs: item.source_refs,
        }),
    );
    timeFields = [...new Set([...(prior?.time_fields ?? []), ...edited])];
  }
  return [
    ...retained.filter((item) => !same(item.target, edit)),
    {
      target: { ...edit },
      value: structuredClone(after.value),
      source_refs: [...after.source_refs],
      ...(timeFields ? { time_fields: timeFields } : {}),
    },
  ];
}

function resolvedText(finding: TripFinding, context?: ReviewFindingContext) {
  const refs = [...new Set(finding.source_refs ?? [])];
  if (!context || !refs.length) return null;
  const items = context.evidence.itemsFor(refs);
  const texts = new Map<string, string>();
  for (const ref of refs) {
    const own = items.filter(
      (item) => "source_ref" in item && item.source_ref === ref,
    );
    if (own.some((item) => item.kind === "missing_reference")) return null;
    const excerpts = own.filter(
      (item) => item.kind === "text_excerpt" || item.kind === "tabular_excerpt",
    );
    if (!excerpts.length || excerpts.some((item) => item.truncated))
      return null;
    texts.set(ref, excerpts.map((item) => item.text).join(""));
  }
  return texts;
}

function partialDates(text: string) {
  return Array.from(
    text.matchAll(
      /(?<![\d:])(?:(?:1[0-2]|0?[1-9])[/.\-](?:3[01]|[12]\d|0?[1-9])|(?:1[0-2]|0?[1-9])月(?:3[01]|[12]\d|0?[1-9])(?:日|號)?)(?!\d)/gu,
    ),
    (match) => match[0],
  );
}
function corrected(
  draft: ParsedTripDraft,
  target: ReviewCorrection["target"],
  context?: ReviewFindingContext,
) {
  const current = targetValue(draft, target);
  return (
    !!current &&
    (context?.corrections ?? []).some(
      (item) =>
        same(item.target, target) &&
        same(current, { value: item.value, source_refs: item.source_refs }) &&
        (target.kind !== "entity" ||
          (["start", "end", "daypart", "crosses_midnight"] as const).every(
            (field) => {
              const time = current.value as TripTime;
              return (
                (field === "crosses_midnight"
                  ? !time[field]
                  : time[field] === null) || item.time_fields?.includes(field)
              );
            },
          )),
    )
  );
}

/** Closed source-linked predicates; a provider code or provenance flag is never proof. */
export function preservationFindingState(
  draft: ParsedTripDraft,
  finding: TripFinding,
  context: ReviewFindingContext | undefined,
  candidateValid: boolean,
): "preserved" | "corrected" | "blocking" {
  const texts = resolvedText(finding, context);
  if (!texts) return "blocking";
  const refs = new Set(texts.keys());
  const scoped = (sourceRefs: string[]) =>
    sourceRefs.some((ref) => refs.has(ref));
  const explicit = finding.entity_refs ?? [];
  if (CLOCK_CODES.has(finding.code)) {
    const deleted = (id: string) =>
      candidateValid &&
      (context?.corrections ?? []).some(
        (item) =>
          item.target.kind === "delete_entity" &&
          item.target.id === id &&
          scoped(item.source_refs) &&
          !draft.entities.some((entity) => entity.id === id),
      );
    const deletedIds = explicit.filter(deleted);
    const entities = explicit.length
      ? explicit
          .filter((id) => !deletedIds.includes(id))
          .map((id) => draft.entities.find((entity) => entity.id === id))
      : draft.entities.filter((entity) => scoped(entity.source_refs));
    if (
      (!entities.length && !deletedIds.length) ||
      entities.some((entity) => !entity || !scoped(entity.source_refs))
    )
      return "blocking";
    let changed = deletedIds.length > 0;
    for (const entity of entities) {
      if (!entity) return "blocking";
      const ownTexts = entity.source_refs.flatMap((ref) =>
        texts.has(ref) ? [texts.get(ref)!] : [],
      );
      const expressions = ownTexts.flatMap(clockExpressionsIn);
      const raw = entity.time.raw_text;
      // Match complete visible tokens, never a substring of a different clock.
      if (
        !raw ||
        !expressions.length ||
        !ownTexts.some((text) => text.includes(raw)) ||
        !expressions.some((expression) => raw.includes(expression))
      )
        return "blocking";
      const noPrecision =
        entity.time.kind === "none" &&
        entity.time.start === null &&
        entity.time.end === null &&
        entity.time.daypart === null &&
        !entity.time.crosses_midnight;
      if (noPrecision) continue;
      if (
        !candidateValid ||
        !corrected(
          draft,
          { kind: "entity", id: entity.id, field: "time" },
          context,
        )
      )
        return "blocking";
      changed = true;
    }
    return changed ? "corrected" : "preserved";
  }

  // Provider scope may identify a Trip, Day or event. It must resolve, but
  // cannot exclude other date-bearing targets tied to the same cited evidence.
  const entities = draft.entities.filter((entity) =>
    scoped(entity.source_refs),
  );
  const days = draft.days.filter(
    (day) =>
      scoped(day.source_refs) ||
      entities.some((entity) => entity.day_id === day.id),
  );
  const tripScoped = scoped(draft.trip.source_refs);
  if (
    explicit.some(
      (id) =>
        !(tripScoped && id === draft.trip.id) &&
        !days.some((day) => day.id === id) &&
        !entities.some((entity) => entity.id === id),
    )
  )
    return "blocking";
  if (!tripScoped && !days.length && !entities.length) return "blocking";
  let changed = false;
  const unknownRefs = new Set<string>();
  for (const target of [
    ...(tripScoped
      ? ([
          { kind: "trip", field: "start_date" },
          { kind: "trip", field: "end_date" },
        ] as const)
      : []),
    ...days.map((day) => ({ kind: "day", id: day.id, field: "date" }) as const),
  ]) {
    const current = targetValue(draft, target)!;
    if (current.value !== null) {
      if (!candidateValid || !corrected(draft, target, context))
        return "blocking";
      changed = true;
      continue;
    }
    const affectedRefs = [
      ...current.source_refs,
      ...entities
        .filter(
          (entity) => target.kind === "day" && entity.day_id === target.id,
        )
        .flatMap((entity) => entity.source_refs),
    ];
    affectedRefs
      .filter((ref) => texts.has(ref))
      .forEach((ref) => unknownRefs.add(ref));
  }
  entities
    .filter((entity) => entity.day_id === null)
    .flatMap((entity) => entity.source_refs)
    .filter((ref) => texts.has(ref))
    .forEach((ref) => unknownRefs.add(ref));
  // Aggregate Days split from one paragraph, while keeping unrelated evidence
  // separate. Undated events can preserve partial dates in their notes/label.
  for (const ref of unknownRefs) {
    const retained = [
      ...days
        .filter(
          (day) =>
            day.source_refs.includes(ref) ||
            entities.some(
              (entity) =>
                entity.day_id === day.id && entity.source_refs.includes(ref),
            ),
        )
        .map((day) => day.label ?? ""),
      ...entities
        .filter((entity) => entity.source_refs.includes(ref))
        .flatMap((entity) => [entity.raw_label ?? "", ...entity.notes]),
      ...draft.supporting_items
        .filter((item) => item.source_refs.includes(ref))
        .map((item) => item.text ?? ""),
    ];
    if (
      partialDates(texts.get(ref)!).some(
        (date) => !retained.some((text) => text.includes(date)),
      )
    )
      return "blocking";
  }
  return changed ? "corrected" : "preserved";
}
