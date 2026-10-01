import type {
  CanonicalTrip,
  DraftEntity,
  ParsedTripDraft,
  TripFinding,
} from "./types";
import { validateTripRelationships } from "./validateTripRelationships";

type SemanticTrip = ParsedTripDraft | CanonicalTrip;
type SemanticEntity = DraftEntity | CanonicalTrip["entities"][number];

const issue = (
  code: string,
  message: string,
  refs: string[] = [],
): TripFinding => ({ code, message, refs, blocking: true });

export function isCalendarDate(value: string | null) {
  if (value === null) return true;
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined)
    return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateTime(entity: SemanticEntity, findings: TripFinding[]) {
  const { time } = entity;
  const add = (code: string, message: string) =>
    findings.push(issue(code, message, [entity.id]));
  if (
    ["exact", "approximate"].includes(time.kind) &&
    (!time.start || time.end || time.daypart)
  ) {
    add(
      "TIME_SHAPE_INVALID",
      `${time.kind} time requires start, no end, and no separate daypart.`,
    );
  }
  if (time.kind === "range" && (!time.start || !time.end)) {
    add("TIME_SHAPE_INVALID", "Range time requires start and end.");
  }
  if (time.kind === "open_ended" && (!time.start || time.end)) {
    add("TIME_SHAPE_INVALID", "Open-ended time requires start and null end.");
  }
  if (time.kind === "daypart" && (!time.daypart || time.start || time.end)) {
    add("TIME_SHAPE_INVALID", "Daypart time requires only a daypart value.");
  }
  if (
    ["none", "all_day"].includes(time.kind) &&
    (time.start || time.end || time.daypart)
  ) {
    add(
      "TIME_SHAPE_INVALID",
      `${time.kind} time cannot contain clock/daypart values.`,
    );
  }
  if (time.crosses_midnight && time.kind !== "range") {
    add("CROSS_MIDNIGHT_INVALID", "Only a range may cross midnight.");
  }
  if (time.kind === "range" && time.start && time.end) {
    if (time.crosses_midnight && time.end > time.start) {
      add(
        "CROSS_MIDNIGHT_INVALID",
        "Cross-midnight end must be on the next clock day.",
      );
    }
    if (!time.crosses_midnight && time.end < time.start) {
      add(
        "TIME_RANGE_REVERSED",
        "Non-cross-midnight range ends before it starts.",
      );
    }
  }
}

function root(trip: SemanticTrip) {
  return "trip" in trip ? trip.trip : trip;
}

export function validateTripSemantics(trip: SemanticTrip): TripFinding[] {
  const findings: TripFinding[] = [];
  const tripRoot = root(trip);
  const hasMeaningfulStructure =
    trip.days.length > 0 ||
    trip.entities.length > 0 ||
    trip.supporting_items.some(
      (item) => Boolean(item.text?.trim()) || Boolean(item.url?.trim()),
    );
  if (!hasMeaningfulStructure) {
    findings.push(
      issue(
        "MINIMUM_TRIP_STRUCTURE_MISSING",
        "Trip requires at least one meaningful day, entity, or supporting item.",
      ),
    );
  }
  const groups: Array<[string, Array<{ id: string }>]> = [
    ["day", trip.days],
    ["entity", trip.entities],
    ["relationship", trip.relationships],
    ["supporting item", trip.supporting_items],
  ];
  if ("trip" in trip) groups.push(["finding", trip.findings]);

  const allIds = new Set([tripRoot.id]);
  for (const [label, records] of groups) {
    for (const record of records) {
      if (allIds.has(record.id)) {
        findings.push(
          issue("DUPLICATE_ID", `Duplicate ${label} ID: ${record.id}`, [
            record.id,
          ]),
        );
      }
      allIds.add(record.id);
    }
  }

  const sourceOrders = new Set<number>();
  for (const day of trip.days) {
    if (sourceOrders.has(day.source_order)) {
      findings.push(
        issue(
          "DUPLICATE_DAY_SOURCE_ORDER",
          `Duplicate Day source order: ${day.source_order}`,
          [day.id],
        ),
      );
    }
    sourceOrders.add(day.source_order);
  }

  const dayIds = new Set(trip.days.map((day) => day.id));
  for (const entity of trip.entities) {
    if (!entity.title.trim()) {
      findings.push(
        issue("ENTITY_TITLE_EMPTY", "Entity title must not be empty.", [
          entity.id,
        ]),
      );
    }
    if (entity.day_id !== null && !dayIds.has(entity.day_id)) {
      findings.push(
        issue(
          "UNKNOWN_DAY_REFERENCE",
          `Unknown day reference: ${entity.day_id}`,
          [entity.id],
        ),
      );
    }
    validateTime(entity, findings);
  }

  if (
    !isCalendarDate(tripRoot.start_date) ||
    !isCalendarDate(tripRoot.end_date)
  ) {
    findings.push(
      issue(
        "TRIP_DATE_INVALID",
        "Trip range contains an invalid calendar date.",
      ),
    );
  }
  if (
    tripRoot.start_date &&
    tripRoot.end_date &&
    tripRoot.start_date > tripRoot.end_date
  ) {
    findings.push(
      issue("TRIP_RANGE_REVERSED", "Trip end date precedes start date."),
    );
  }
  for (const day of trip.days) {
    if (!isCalendarDate(day.date)) {
      findings.push(
        issue("DAY_DATE_INVALID", `Invalid day date: ${day.date}`, [day.id]),
      );
    }
    if (
      day.date &&
      tripRoot.start_date &&
      tripRoot.end_date &&
      (day.date < tripRoot.start_date || day.date > tripRoot.end_date)
    ) {
      findings.push(
        issue(
          "DAY_OUTSIDE_TRIP_RANGE",
          `Day is outside trip range: ${day.date}`,
          [day.id],
        ),
      );
    }
  }
  for (const item of trip.supporting_items) {
    if (!item.text?.trim() && !item.url?.trim()) {
      findings.push(
        issue(
          "SUPPORTING_ITEM_EMPTY",
          "Supporting item requires text or a supported URL.",
          [item.id],
        ),
      );
    }
  }

  const supportingGroups = new Map<
    string,
    { label: string; order: number; itemId: string }
  >();
  for (const item of trip.supporting_items) {
    // Provider output is validated before deterministic group derivation, so
    // its supporting items temporarily have no group member at runtime.
    if (!item.group) continue;
    const existing = supportingGroups.get(item.group.id);
    if (
      existing &&
      (existing.label !== item.group.label ||
        existing.order !== item.group.order)
    ) {
      findings.push(
        issue(
          "SUPPORTING_GROUP_INCONSISTENT",
          `Supporting group ${item.group.id} has inconsistent label or order.`,
          [existing.itemId, item.id],
        ),
      );
    } else if (!existing) {
      supportingGroups.set(item.group.id, {
        label: item.group.label,
        order: item.group.order,
        itemId: item.id,
      });
    }
  }

  findings.push(...validateTripRelationships(trip).findings);
  return findings;
}
