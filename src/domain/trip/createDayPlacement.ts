import type {
  CanonicalTrip,
  ParsedTripDraft,
  TripFinding,
  TripRelationship,
} from "./types";

export type DayPlacement =
  | { role: "entity"; id: string }
  | { role: "relationship_group"; id: string; items: DayPlacement[] };

const idsOf = (relationship: TripRelationship) =>
  relationship.type === "parent_child"
    ? [relationship.parent_entity_id!, ...relationship.child_entity_ids]
    : relationship.member_entity_ids;

/** Shared authoritative policy: laminar groups nest; crossing groups cannot own a leaf twice. */
export function createDayPlacement(
  trip: CanonicalTrip | ParsedTripDraft,
  dayId: string | null,
) {
  const findings: TripFinding[] = [];
  const report = (code: string, refs: string[]) =>
    findings.push({
      code,
      refs,
      blocking: true,
      message:
        code === "RELATIONSHIP_PLACEMENT_CONFLICT"
          ? "Relationship groups overlap without a representable nesting. Review their members."
          : "Relationship sequence cannot be represented in one ordered day tree.",
    });
  const dayEntities = trip.entities.filter((entity) => entity.day_id === dayId);
  const dayIds = new Set(dayEntities.map((entity) => entity.id));
  const descendants = new Map<string, string[]>();
  for (const relationship of trip.relationships) {
    if (relationship.type === "parent_child" && relationship.parent_entity_id) {
      descendants.set(relationship.parent_entity_id, [
        ...(descendants.get(relationship.parent_entity_id) ?? []),
        ...relationship.child_entity_ids,
      ]);
    }
  }
  const expand = (id: string, found: Set<string>) => {
    if (found.has(id)) return;
    found.add(id);
    for (const child of descendants.get(id) ?? []) expand(child, found);
  };
  const groups = trip.relationships
    .filter((group) => group.type !== "sequence")
    .map((group) => {
      const expanded = new Set<string>();
      for (const id of idsOf(group)) expand(id, expanded);
      return {
        id: group.id,
        fullIds: expanded,
        ids: new Set([...expanded].filter((id) => dayIds.has(id))),
      };
    })
    .filter((group) => group.ids.size > 0);
  const subset = (a: Set<string>, b: Set<string>) =>
    [...a].every((id) => b.has(id));
  for (let i = 0; i < groups.length; i++)
    for (let j = i + 1; j < groups.length; j++) {
      const a = groups[i],
        b = groups[j];
      if (![...a.ids].some((id) => b.ids.has(id))) continue;
      if (
        (subset(a.fullIds, b.fullIds) && a.fullIds.size < b.fullIds.size) ||
        (subset(b.fullIds, a.fullIds) && b.fullIds.size < a.fullIds.size)
      )
        continue;
      report("RELATIONSHIP_PLACEMENT_CONFLICT", [
        a.id,
        b.id,
        ...[...a.ids].filter((id) => b.ids.has(id)),
      ]);
    }
  if (findings.length) return { items: [] as DayPlacement[], findings };
  const owner = new Map<string, string>();
  for (const group of groups) {
    const parent = groups
      .filter(
        (candidate) =>
          candidate.fullIds.size > group.fullIds.size &&
          subset(group.fullIds, candidate.fullIds),
      )
      .sort((a, b) => a.fullIds.size - b.fullIds.size)[0];
    if (parent) owner.set(group.id, parent.id);
  }
  const sequences = trip.relationships.filter(
    (group) => group.type === "sequence",
  );
  const rank = new Map(dayEntities.map((entity, index) => [entity.id, index]));
  const build = (parent: string | null, scope: Set<string>): DayPlacement[] => {
    const children = groups.filter(
      (group) => (owner.get(group.id) ?? null) === parent,
    );
    const covered = new Set(children.flatMap((group) => [...group.ids]));
    const entries = [
      ...children.map((group) => ({
        node: {
          role: "relationship_group",
          id: group.id,
          items: build(group.id, group.ids),
        } as DayPlacement,
        ids: group.ids,
      })),
      ...[...scope]
        .filter((id) => !covered.has(id))
        .map((id) => ({
          node: { role: "entity", id } as DayPlacement,
          ids: new Set([id]),
        })),
    ].sort(
      (a, b) =>
        Math.min(...[...a.ids].map((id) => rank.get(id)!)) -
        Math.min(...[...b.ids].map((id) => rank.get(id)!)),
    );
    const edges = entries.map(() => new Set<number>());
    // A venue/program parent remains the heading for its children even when
    // the source entity array lists a program slot first.
    for (const relationship of trip.relationships) {
      if (
        relationship.type !== "parent_child" ||
        !relationship.parent_entity_id ||
        !scope.has(relationship.parent_entity_id)
      )
        continue;
      const from = entries.findIndex((entry) =>
        entry.ids.has(relationship.parent_entity_id!),
      );
      for (const child of relationship.child_entity_ids) {
        const to = entries.findIndex((entry) => entry.ids.has(child));
        if (from >= 0 && to >= 0 && from !== to) edges[from].add(to);
      }
    }
    for (const sequence of sequences) {
      const members = sequence.member_entity_ids.filter((id) => scope.has(id));
      for (let i = 1; i < members.length; i++) {
        const from = entries.findIndex((entry) =>
          entry.ids.has(members[i - 1]),
        );
        const to = entries.findIndex((entry) => entry.ids.has(members[i]));
        if (from >= 0 && to >= 0 && from !== to) edges[from].add(to);
      }
    }
    const remaining = new Set(entries.map((_, index) => index));
    const ordered: DayPlacement[] = [];
    while (remaining.size) {
      const next = [...remaining].find(
        (index) => ![...remaining].some((other) => edges[other].has(index)),
      );
      if (next === undefined) {
        report(
          "RELATIONSHIP_SEQUENCE_CONFLICT",
          sequences.map((sequence) => sequence.id),
        );
        break;
      }
      ordered.push(entries[next].node);
      remaining.delete(next);
    }
    return ordered;
  };
  return { items: build(null, dayIds), findings };
}
