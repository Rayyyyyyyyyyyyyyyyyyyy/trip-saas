import { createDayPlacement } from "./createDayPlacement";
import type { CanonicalTrip, ParsedTripDraft, TripFinding } from "./types";

const finding = (
  code: string,
  message: string,
  refs: string[],
  blocking = true,
): TripFinding => ({
  code,
  message,
  refs,
  blocking,
});

export function validateTripRelationships(
  draft: ParsedTripDraft | CanonicalTrip,
) {
  const findings: TripFinding[] = [];
  const entityIds = new Set(draft.entities.map((entity) => entity.id));

  for (const relationship of draft.relationships) {
    const refs = [
      ...relationship.member_entity_ids,
      ...(relationship.parent_entity_id ? [relationship.parent_entity_id] : []),
      ...relationship.child_entity_ids,
    ];
    for (const entityId of refs) {
      if (!entityIds.has(entityId)) {
        findings.push(
          finding(
            "UNKNOWN_ENTITY_REFERENCE",
            `Relationship references unknown entity: ${entityId}`,
            [relationship.id, entityId],
          ),
        );
      }
    }
    if (
      relationship.parent_entity_id &&
      relationship.child_entity_ids.includes(relationship.parent_entity_id)
    ) {
      findings.push(
        finding(
          "SELF_RELATIONSHIP",
          "Parent entity cannot also be its own child.",
          [relationship.id, relationship.parent_entity_id],
        ),
      );
    }

    const memberCount = relationship.member_entity_ids.length;
    if (
      ["sequence", "alternative", "fallback"].includes(relationship.type) &&
      memberCount < 2
    ) {
      findings.push(
        finding(
          "RELATIONSHIP_MEMBERS_MISSING",
          `${relationship.type} requires at least two members.`,
          [relationship.id],
        ),
      );
    }
    if (
      relationship.type === "conditional" &&
      (memberCount < 1 || !relationship.condition)
    ) {
      findings.push(
        finding(
          "CONDITIONAL_RELATIONSHIP_INCOMPLETE",
          "Conditional relationship requires members and a condition.",
          [relationship.id],
        ),
      );
    }
    if (
      relationship.type === "parent_child" &&
      (!relationship.parent_entity_id ||
        relationship.child_entity_ids.length < 1)
    ) {
      findings.push(
        finding(
          "PARENT_CHILD_INCOMPLETE",
          "Parent-child relationship requires one parent and at least one child.",
          [relationship.id],
        ),
      );
    }
  }

  for (const dayId of new Set(draft.entities.map((entity) => entity.day_id))) {
    findings.push(...createDayPlacement(draft, dayId).findings);
  }

  const duplicateKeys = new Map<string, string>();
  for (const entity of draft.entities) {
    const key = [
      entity.day_id,
      entity.semantic_type,
      entity.title.trim().toLocaleLowerCase(),
      entity.place.name?.trim().toLocaleLowerCase() ?? "",
    ].join("|");
    const existing = duplicateKeys.get(key);
    if (existing) {
      findings.push(
        finding(
          "DUPLICATE_ENTITY_CANDIDATE",
          "Entities may describe the same source intent and require Review.",
          [existing, entity.id],
          false,
        ),
      );
    } else {
      duplicateKeys.set(key, entity.id);
    }

    const todoIds = new Set(
      [
        entity.reservation?.todo_id,
        entity.ticket?.todo_id,
        entity.readiness?.todo_id,
      ].filter(Boolean),
    );
    if (todoIds.size > 1) {
      findings.push(
        finding(
          "DEPENDENCY_ID_CONFLICT",
          "Reservation, ticket, and readiness identities conflict.",
          [entity.id],
        ),
      );
    }
  }

  return {
    valid: findings.every((item) => !item.blocking),
    findings,
  };
}
