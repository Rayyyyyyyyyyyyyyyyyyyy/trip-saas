import {
  createDayPlacement,
  type DayPlacement,
} from "../../domain/trip/createDayPlacement";
import type {
  CanonicalEntity,
  CanonicalTrip,
  Daypart,
  ReadinessDependency,
  ReservationDependency,
  SupportingItem,
  TicketDependency,
  TimeKind,
  TripAction,
  TripRelationship,
  TripTime,
} from "../../domain/trip/types";
import { mapSearchHref } from "./mapSearchHref";

export interface ProjectedTime {
  kind: TimeKind;
  label: string | null | undefined;
  start: string | null;
  end: string | null;
  daypart: Daypart;
  rawText: string | null;
  crossesMidnight: boolean;
  hasKnownStart: boolean;
  hasKnownEnd: boolean;
  isUntimed: boolean;
}

export type ProjectedDependency =
  | ({ type: "reservation" } & ReservationDependency)
  | ({ type: "ticket" } & TicketDependency)
  | ({ type: "readiness" } & ReadinessDependency);

export interface ProjectedEntity {
  id: string;
  dayId: string | null;
  role:
    | "transit_connector"
    | "optional"
    | "flexible_space"
    | "fixed_anchor"
    | "timeline_item";
  anchorPriority: "fixed" | "normal";
  semanticType: CanonicalEntity["semantic_type"];
  title: string;
  place: CanonicalEntity["place"];
  time: ProjectedTime;
  state: CanonicalEntity["state"];
  modifiers: string[];
  reservation: ReservationDependency | null;
  ticket: TicketDependency | null;
  readiness: ReadinessDependency | null;
  dependencies: ProjectedDependency[];
  notes: string[];
  /** Non-map source actions; the map action is resolved into `mapAction`. */
  actions: Array<TripAction & { target: "_blank"; rel: "noopener noreferrer" }>;
  /** Source map URL first; otherwise a labeled search for the verbatim place text. */
  mapAction: {
    kind: "source" | "search";
    url: string;
    query: string | null;
    label: string;
    accessibleName: string;
    target: "_blank";
    rel: "noopener noreferrer";
  } | null;
  /** Place text to show on its own line, or null when absent or already in the title. */
  placeLine: string | null;
  /** At most one state label; alternative members carry none. */
  stateLabel: "tentative" | "optional" | null;
  unresolved: { entity: boolean; place: boolean; any: boolean };
}

export interface ProjectedRelationship {
  id: string;
  type: TripRelationship["type"];
  condition: string | null;
  parentEntityId: string | null;
  memberReferences: ReturnType<typeof compactEntityReference>[];
}

export type ProjectedDayItem =
  | {
      role: "entity" | "transit_connector" | "flexible_space";
      id: string;
      entity: ProjectedEntity;
    }
  | {
      role: "relationship_group";
      id: string;
      relationship: ProjectedRelationship;
      items: ProjectedDayItem[];
    };

function projectTime(time: TripTime): ProjectedTime {
  const daypartLabels: Record<Exclude<Daypart, null>, string> = {
    morning: "上午",
    afternoon: "下午",
    evening: "傍晚",
    night: "晚上",
    unknown: "時段未定",
  };
  const labels: Record<TimeKind, string | null | undefined> = {
    exact: time.start,
    approximate: time.start ? `約 ${time.start}` : time.raw_text,
    range:
      time.start && time.end
        ? `${time.start}–${time.crosses_midnight ? "翌日 " : ""}${time.end}`
        : time.raw_text,
    daypart:
      time.raw_text ?? (time.daypart ? daypartLabels[time.daypart] : undefined),
    none: time.raw_text,
    open_ended: time.start ? `${time.start} 起` : time.raw_text,
    all_day: time.raw_text ?? "全天",
  };
  return {
    kind: time.kind,
    label: labels[time.kind],
    start: time.start,
    end: time.end,
    daypart: time.daypart,
    rawText: time.raw_text,
    crossesMidnight: time.crosses_midnight,
    hasKnownStart: time.start !== null,
    hasKnownEnd: time.end !== null,
    isUntimed: time.kind === "none",
  };
}

function isFixedAnchor(entity: CanonicalEntity) {
  return (
    !entity.state.optional &&
    !entity.state.flexible &&
    ["exact", "range", "open_ended", "all_day"].includes(entity.time.kind)
  );
}

function presentationRole(entity: CanonicalEntity): ProjectedEntity["role"] {
  if (entity.state.optional) return "optional";
  if (entity.semantic_type === "transit") {
    return isFixedAnchor(entity) &&
      (entity.reservation || entity.ticket || entity.readiness)
      ? "fixed_anchor"
      : "transit_connector";
  }
  if (entity.semantic_type === "free_time" || entity.state.flexible) {
    return "flexible_space";
  }
  if (isFixedAnchor(entity)) return "fixed_anchor";
  return "timeline_item";
}

const normalizeText = (text: string | null) =>
  (text ?? "").replace(/\s+/g, " ").trim();

function projectMapAction(
  entity: CanonicalEntity,
  sourceLabel?: (entity: CanonicalEntity) => string,
): ProjectedEntity["mapAction"] {
  const external = { target: "_blank", rel: "noopener noreferrer" } as const;
  const sourceUrl =
    entity.place.url ??
    entity.actions.find((action) => action.kind === "map")?.url ??
    null;
  if (sourceUrl) {
    const label = sourceLabel?.(entity) ?? "地圖";
    return {
      kind: "source",
      url: sourceUrl,
      query: null,
      label,
      accessibleName: sourceLabel ? label : `開啟「${entity.title}」的地圖連結`,
      ...external,
    };
  }
  const query = [entity.place.name, entity.place.address].find(
    (candidate): candidate is string =>
      candidate !== null && candidate.trim().length > 0,
  );
  if (query === undefined) return null;
  return {
    kind: "search",
    url: mapSearchHref(query),
    query,
    label: "搜尋 Google 地圖",
    accessibleName: `以「${query}」搜尋 Google 地圖`,
    ...external,
  };
}

function projectPlaceLine(entity: CanonicalEntity) {
  const title = normalizeText(entity.title);
  const parts = [entity.place.name, entity.place.address]
    .filter((part): part is string => Boolean(part?.trim()))
    .filter((part) => !title.includes(normalizeText(part)));
  return parts.length ? parts.join(" · ") : null;
}

function projectStateLabel(
  entity: CanonicalEntity,
  isAlternativeMember: boolean,
): ProjectedEntity["stateLabel"] {
  if (isAlternativeMember) return null;
  if (entity.state.tentative) return "tentative";
  if (entity.state.optional) return "optional";
  return null;
}

function projectEntity(
  entity: CanonicalEntity,
  isAlternativeMember: boolean,
  sourceMapActionLabel?: (entity: CanonicalEntity) => string,
): ProjectedEntity {
  const modifiers = Object.entries(entity.state)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
  const dependencies = (
    [
      entity.reservation
        ? { type: "reservation", ...entity.reservation }
        : null,
      entity.ticket ? { type: "ticket", ...entity.ticket } : null,
      entity.readiness ? { type: "readiness", ...entity.readiness } : null,
    ] as Array<ProjectedDependency | null>
  ).filter(
    (dependency): dependency is ProjectedDependency => dependency !== null,
  );
  return {
    id: entity.id,
    dayId: entity.day_id,
    role: presentationRole(entity),
    anchorPriority: isFixedAnchor(entity) ? "fixed" : "normal",
    semanticType: entity.semantic_type,
    title: entity.title,
    place: entity.place,
    time: projectTime(entity.time),
    state: entity.state,
    modifiers,
    reservation: entity.reservation,
    ticket: entity.ticket,
    readiness: entity.readiness,
    dependencies,
    notes: entity.notes,
    actions: entity.actions
      .filter((action) => action.kind !== "map")
      .map((action) => ({
        ...action,
        target: "_blank",
        rel: "noopener noreferrer",
      })),
    mapAction: projectMapAction(entity, sourceMapActionLabel),
    placeLine: projectPlaceLine(entity),
    stateLabel: projectStateLabel(entity, isAlternativeMember),
    unresolved: {
      entity: entity.state.unresolved,
      place: entity.place.unresolved,
      any: entity.state.unresolved || entity.place.unresolved,
    },
  };
}

// An unresolved asset without a URL is an image reference the source named but
// did not supply. Resolved supporting assets remain visible even without an
// action URL.
const isUnimportedAsset = (item: SupportingItem) =>
  item.kind === "asset" && item.unresolved && item.url === null;

function projectSupportingItem(item: SupportingItem) {
  return {
    id: item.id,
    role: "supporting_reference",
    kind: item.kind,
    text: item.text,
    displayTitle: item.text ?? item.kind,
    unresolved: item.unresolved,
    unresolvedMessage: "這份資料還需要確認",
    action: item.url
      ? {
          url: item.url,
          target: "_blank",
          rel: "noopener noreferrer",
        }
      : null,
  };
}

export type ProjectedSupportingItem = ReturnType<typeof projectSupportingItem>;

export interface ProjectedSupportingGroup {
  id: string;
  label: string;
  order: number;
  count: number;
  items: ProjectedSupportingItem[];
}

export function verifySupportingPlacement(
  canonicalIds: string[],
  ungroupedItems: ProjectedSupportingItem[],
  groups: ProjectedSupportingGroup[],
  unrenderedIds: string[],
) {
  const expected = new Set<string>();
  for (const id of canonicalIds) {
    if (expected.has(id)) {
      throw new Error("Canonical supporting items contain duplicate IDs.");
    }
    expected.add(id);
  }
  const placed = [
    ...ungroupedItems.map((item) => item.id),
    ...groups.flatMap((group) => group.items.map((item) => item.id)),
    ...unrenderedIds,
  ];
  const placementCounts = new Map<string, number>();
  for (const id of placed) {
    placementCounts.set(id, (placementCounts.get(id) ?? 0) + 1);
  }
  if (
    placed.some((id) => !expected.has(id)) ||
    [...expected].some((id) => placementCounts.get(id) !== 1)
  ) {
    throw new Error(
      "Supporting projection must place every canonical item exactly once.",
    );
  }
}

function projectSupportingItems(items: SupportingItem[]) {
  const ungroupedItems: ProjectedSupportingItem[] = [];
  const groupsById = new Map<
    string,
    ProjectedSupportingGroup & { firstItemIndex: number }
  >();
  const unrenderedIds: string[] = [];

  items.forEach((item, itemIndex) => {
    if (isUnimportedAsset(item)) {
      unrenderedIds.push(item.id);
      return;
    }
    const projected = projectSupportingItem(item);
    if (!item.group) {
      ungroupedItems.push(projected);
      return;
    }
    const existing = groupsById.get(item.group.id);
    if (existing) {
      if (
        existing.label !== item.group.label ||
        existing.order !== item.group.order
      ) {
        throw new Error(
          "Canonical supporting group has inconsistent label or order.",
        );
      }
      existing.items.push(projected);
      existing.count = existing.items.length;
      return;
    }
    groupsById.set(item.group.id, {
      ...item.group,
      count: 1,
      firstItemIndex: itemIndex,
      items: [projected],
    });
  });

  const groups = [...groupsById.values()]
    .sort(
      (left, right) =>
        left.order - right.order || left.firstItemIndex - right.firstItemIndex,
    )
    .map(({ firstItemIndex: _firstItemIndex, ...group }) => group);
  verifySupportingPlacement(
    items.map((item) => item.id),
    ungroupedItems,
    groups,
    unrenderedIds,
  );
  return { groups, ungroupedItems, unrenderedIds };
}

function compactEntityReference(entity: ProjectedEntity) {
  return {
    id: entity.id,
    dayId: entity.dayId,
    title: entity.title,
    time: { label: entity.time.label },
  };
}

function relationshipEntityIds(relationship: TripRelationship) {
  return relationship.type === "parent_child"
    ? [
        ...(relationship.parent_entity_id
          ? [relationship.parent_entity_id]
          : []),
        ...relationship.child_entity_ids,
      ]
    : relationship.member_entity_ids;
}

function projectRelationship(
  relationship: TripRelationship,
  entitiesById: Map<string, ProjectedEntity>,
  excludedIds: Set<string> = new Set(),
): ProjectedRelationship {
  return {
    id: relationship.id,
    type: relationship.type,
    condition: relationship.condition,
    parentEntityId: relationship.parent_entity_id,
    memberReferences: relationshipEntityIds(relationship)
      .filter((id) => !excludedIds.has(id))
      .map((id) => entitiesById.get(id))
      .filter((entity): entity is ProjectedEntity => Boolean(entity))
      .map(compactEntityReference),
  };
}

function itemEntityIds(items: ProjectedDayItem[]): string[] {
  return items.flatMap((item) =>
    item.role === "relationship_group" ? itemEntityIds(item.items) : [item.id],
  );
}

export function createTripPresentation(
  canonicalTrip: CanonicalTrip,
  options: {
    sourceMapActionLabel?: (entity: CanonicalEntity) => string;
  } = {},
) {
  const alternativeMemberIds = new Set(
    canonicalTrip.relationships
      .filter((relationship) => relationship.type === "alternative")
      .flatMap((relationship) => relationship.member_entity_ids),
  );
  const projectedEntities = canonicalTrip.entities.map((entity) =>
    projectEntity(
      entity,
      alternativeMemberIds.has(entity.id),
      options.sourceMapActionLabel,
    ),
  );
  const projectedEntitiesById = new Map(
    projectedEntities.map((entity) => [entity.id, entity]),
  );
  const relationshipsById = new Map(
    canonicalTrip.relationships.map((relationship) => [
      relationship.id,
      relationship,
    ]),
  );
  const projectItems = (
    items: DayPlacement[],
    optional: boolean,
  ): ProjectedDayItem[] =>
    items.flatMap((item): ProjectedDayItem[] => {
      if (item.role === "entity") {
        const entity = projectedEntitiesById.get(item.id)!;
        if (entity.state.optional !== optional) return [];
        return [
          {
            role:
              entity.role === "transit_connector" ||
              entity.role === "flexible_space"
                ? entity.role
                : "entity",
            id: entity.id,
            entity,
          },
        ];
      }
      const children = projectItems(item.items, optional);
      if (!children.length) return [];
      const relationship = relationshipsById.get(item.id)!;
      const placedIds = new Set(itemEntityIds(children));
      return [
        {
          role: "relationship_group",
          id: item.id,
          relationship: projectRelationship(
            relationship,
            projectedEntitiesById,
            placedIds,
          ),
          items: children,
        },
      ];
    });
  const supportingProjection = projectSupportingItems(
    canonicalTrip.supporting_items,
  );
  const entitiesByDay = new Map<string | null, ProjectedEntity[]>();
  for (const entity of projectedEntities) {
    const existing = entitiesByDay.get(entity.dayId) ?? [];
    existing.push(entity);
    entitiesByDay.set(entity.dayId, existing);
  }
  const sequenceContextsFor = (dayId: string | null) =>
    canonicalTrip.relationships
      .filter(
        (relationship) =>
          relationship.type === "sequence" &&
          relationship.member_entity_ids.some(
            (id) => projectedEntitiesById.get(id)?.dayId === dayId,
          ),
      )
      .map((relationship) =>
        projectRelationship(relationship, projectedEntitiesById),
      );
  const projectedDays = [...canonicalTrip.days]
    .sort((left, right) => left.source_order - right.source_order)
    .map((day) => {
      const entities = entitiesByDay.get(day.id) ?? [];
      const placement = createDayPlacement(canonicalTrip, day.id);
      if (placement.findings.length)
        throw new Error(
          "Canonical trip has incompatible relationship placement.",
        );
      return {
        id: day.id,
        date: day.date,
        label: day.label,
        title: day.title,
        subtitle: day.subtitle,
        leaveBy: day.leave_by,
        fixedAnchors: entities
          .filter((entity) => entity.role === "fixed_anchor")
          .map(({ id, title, time }) => ({
            id,
            title,
            time: { label: time.label },
          })),
        sequenceContexts: sequenceContextsFor(day.id),
        items: projectItems(placement.items, false),
        optional: projectItems(placement.items, true),
      };
    });
  const undatedPlacement = createDayPlacement(canonicalTrip, null);
  if (undatedPlacement.findings.length)
    throw new Error(
      "Canonical trip has incompatible undated relationship placement.",
    );
  const undated = {
    sequenceContexts: sequenceContextsFor(null),
    items: projectItems(undatedPlacement.items, false),
    optional: projectItems(undatedPlacement.items, true),
  };
  const primaryEntityIds = [
    ...projectedDays.flatMap((day) => [
      ...itemEntityIds(day.items),
      ...itemEntityIds(day.optional),
    ]),
    ...itemEntityIds(undated.items),
    ...itemEntityIds(undated.optional),
  ];
  const placementCounts = new Map<string, number>();
  for (const id of primaryEntityIds)
    placementCounts.set(id, (placementCounts.get(id) ?? 0) + 1);
  if (
    canonicalTrip.entities.some(
      (entity) => placementCounts.get(entity.id) !== 1,
    )
  ) {
    throw new Error(
      "Canonical trip does not have exactly one primary placement per entity.",
    );
  }

  return {
    trip: {
      id: canonicalTrip.id,
      title: canonicalTrip.title,
      startDate: canonicalTrip.start_date,
      endDate: canonicalTrip.end_date,
      timezone: canonicalTrip.timezone,
      geography: canonicalTrip.geography,
    },
    overview: {
      flights: projectedEntities
        .filter((entity) => entity.semanticType === "flight")
        .map(compactEntityReference),
      accommodations: projectedEntities
        .filter((entity) => entity.semanticType === "accommodation")
        .map(compactEntityReference),
      readinessAttention: projectedEntities
        .filter((entity) =>
          entity.dependencies.some((dependency) =>
            ["action_needed", "pending", "blocked"].includes(dependency.status),
          ),
        )
        .map((entity) => ({
          ...compactEntityReference(entity),
          dependencies: entity.dependencies.map(({ type, status }) => ({
            type,
            status,
          })),
        })),
      criticalAnchors: projectedEntities
        .filter((entity) => entity.anchorPriority === "fixed")
        .map(compactEntityReference),
      days: projectedDays.map(({ id, date, label, title, subtitle }) => ({
        id,
        date,
        label,
        title,
        subtitle,
      })),
    },
    supportingItems: supportingProjection.ungroupedItems,
    supportingGroups: supportingProjection.groups,
    unrenderedSupportingIds: supportingProjection.unrenderedIds,
    undated,
    days: projectedDays,
  };
}

export type TripPresentation = ReturnType<typeof createTripPresentation>;
