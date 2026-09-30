import { CANONICAL_TRIP_SCHEMA_VERSION } from "./canonicalTripContract";
import { validateCanonicalTripSchema } from "./schemaValidators";
import { validateTripSemantics } from "./validateTripSemantics";
import type {
  CanonicalTrip,
  ParsedTripDraft,
  ReservationDependency,
  TicketDependency,
  TripFinding,
  ValidationResult,
} from "./types";

const copy = <T>(value: T): T => structuredClone(value);

function dependency<T extends ReservationDependency | TicketDependency>(
  value: T | null,
): T | null {
  return value
    ? ({
        status: value.status,
        reference: value.reference,
        detail: value.detail,
        todo_id: value.todo_id,
      } as T)
    : null;
}

export function buildCanonicalTrip(
  reviewedDraft: ParsedTripDraft,
  context: { sourceId?: string | null } = {},
): CanonicalTrip {
  return {
    schema_version: CANONICAL_TRIP_SCHEMA_VERSION,
    id: reviewedDraft.trip.id,
    title: reviewedDraft.trip.title,
    start_date: reviewedDraft.trip.start_date,
    end_date: reviewedDraft.trip.end_date,
    timezone: reviewedDraft.trip.timezone,
    geography: copy(reviewedDraft.trip.geography),
    days: reviewedDraft.days.map((day) => ({
      id: day.id,
      date: day.date,
      source_order: day.source_order,
      label: day.label,
      title: day.title,
      subtitle: day.subtitle,
      leave_by: day.leave_by,
    })),
    entities: reviewedDraft.entities.map((entity) => ({
      id: entity.id,
      day_id: entity.day_id,
      semantic_type: entity.semantic_type,
      title: entity.title,
      place: {
        name: entity.place.name,
        address: entity.place.address,
        url: entity.place.url,
        unresolved: entity.place.unresolved,
      },
      time: {
        kind: entity.time.kind,
        start: entity.time.start,
        end: entity.time.end,
        daypart: entity.time.daypart,
        raw_text: entity.time.raw_text,
        crosses_midnight: entity.time.crosses_midnight,
      },
      state: {
        optional: entity.state.optional,
        tentative: entity.state.tentative,
        flexible: entity.state.flexible,
        unresolved: entity.state.unresolved,
      },
      reservation: dependency<ReservationDependency>(entity.reservation),
      ticket: dependency<TicketDependency>(entity.ticket),
      readiness: entity.readiness
        ? {
            kind: entity.readiness.kind,
            status: entity.readiness.status,
            detail: entity.readiness.detail,
            todo_id: entity.readiness.todo_id,
          }
        : null,
      notes: copy(entity.notes),
      actions: entity.actions.map((action) => ({
        id: action.id,
        kind: action.kind,
        label: action.label,
        url: action.url,
      })),
      provenance:
        entity.provenance.origin === "user"
          ? {
              origin: "user",
              overridden_fields: copy(entity.provenance.overridden_fields),
              source_id: null,
              locator_refs: [],
            }
          : context.sourceId && entity.source_refs.length > 0
            ? {
                origin: "source",
                overridden_fields: copy(entity.provenance.overridden_fields),
                source_id: context.sourceId,
                locator_refs: [...new Set(entity.source_refs)].slice(0, 128),
              }
            : {
                origin: "legacy_unavailable",
                overridden_fields: copy(entity.provenance.overridden_fields),
                source_id: null,
                locator_refs: [],
              },
    })),
    relationships: reviewedDraft.relationships.map((relationship) => ({
      id: relationship.id,
      type: relationship.type,
      member_entity_ids: copy(relationship.member_entity_ids),
      parent_entity_id: relationship.parent_entity_id,
      child_entity_ids: copy(relationship.child_entity_ids),
      condition: relationship.condition,
    })),
    supporting_items: reviewedDraft.supporting_items.map((item) => ({
      id: item.id,
      kind: item.kind,
      text: item.text,
      url: item.url,
      unresolved: item.unresolved,
    })),
  };
}

export function validateCanonicalTripAuthoritatively(
  canonicalTrip: CanonicalTrip,
): ValidationResult {
  const schema = validateCanonicalTripSchema(canonicalTrip);
  if (!schema.valid) {
    return {
      valid: false,
      findings: [
        {
          code: "CANONICAL_SCHEMA_INVALID",
          message: "CanonicalTrip schema is invalid.",
          refs: [],
          blocking: true,
        },
      ],
      schemaErrors: schema.errors,
    };
  }

  const findings: TripFinding[] = validateTripSemantics(canonicalTrip);

  return {
    valid: findings.every((item) => !item.blocking),
    findings,
    schemaErrors: [],
  };
}
