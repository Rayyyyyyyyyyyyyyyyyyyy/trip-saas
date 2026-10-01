import type {
  CanonicalDay,
  CanonicalEntity,
  CanonicalTrip,
  ReadinessDependency,
  SemanticType,
  TripTime,
} from "../../../src/domain/trip/types";

const day = {
  id: "semantic:day:relationship-state",
  date: "2026-09-13",
  source_order: 0,
  label: "Relationship and state semantics",
  title: "Relationship and state semantics",
  subtitle: null,
  leave_by: null,
} satisfies CanonicalDay;

const noTime: TripTime = {
  kind: "none",
  start: null,
  end: null,
  daypart: null,
  raw_text: null,
  crosses_midnight: false,
};

function relationshipStateEntity({
  id,
  title,
  semanticType = "activity",
  optional = false,
  tentative = false,
  flexible = false,
  unresolved = false,
  readiness = null,
}: {
  id: string;
  title: string;
  semanticType?: SemanticType;
  optional?: boolean;
  tentative?: boolean;
  flexible?: boolean;
  unresolved?: boolean;
  readiness?: ReadinessDependency | null;
}): CanonicalEntity {
  return {
    id,
    day_id: day.id,
    semantic_type: semanticType,
    title,
    place: {
      name: unresolved ? "地址待確認" : null,
      address: unresolved ? "大阪市內" : null,
      url: null,
      unresolved,
    },
    time: noTime,
    state: { optional, tentative, flexible, unresolved },
    reservation: null,
    ticket: null,
    readiness,
    notes: [],
    actions: [],
    provenance: {
      origin: "source",
      overridden_fields: [],
      source_id: "source:relationship-semantics",
      locator_refs: [`source:${id}`],
    },
  };
}

const entities: CanonicalEntity[] = [
  relationshipStateEntity({
    id: "semantic:entity:plan-a",
    title: "Plan A",
    optional: true,
  }),
  relationshipStateEntity({
    id: "semantic:entity:plan-b",
    title: "Plan B",
    optional: true,
  }),
  relationshipStateEntity({
    id: "semantic:entity:rain-plan",
    title: "Rain plan",
    optional: true,
    tentative: true,
  }),
  relationshipStateEntity({
    id: "semantic:entity:fallback-cafe",
    title: "Fallback cafe",
    optional: true,
  }),
  relationshipStateEntity({
    id: "semantic:entity:free-morning",
    title: "Free morning",
    semanticType: "free_time",
    flexible: true,
  }),
  relationshipStateEntity({
    id: "semantic:entity:free-evening",
    title: "Free evening",
    semanticType: "free_time",
    tentative: true,
    flexible: true,
  }),
  relationshipStateEntity({
    id: "semantic:entity:document-check",
    title: "Document check",
    semanticType: "preparation",
    readiness: {
      kind: "document",
      status: "action_needed",
      detail: "護照影本",
      todo_id: "todo:passport-copy",
    },
  }),
  relationshipStateEntity({
    id: "semantic:entity:unresolved-place",
    title: "Unresolved dinner place",
    semanticType: "restaurant",
    unresolved: true,
  }),
];

entities[0].time = {
  kind: "range",
  start: "23:30",
  end: "01:00",
  daypart: null,
  raw_text: "23:30–翌日 01:00",
  crosses_midnight: true,
};
entities[0].state.tentative = true;
entities[0].state.flexible = true;
entities[0].state.unresolved = true;
entities[0].place = {
  name: "Address-first venue",
  address: "大阪市內地址待確認",
  url: null,
  unresolved: true,
};
entities[0].reservation = {
  status: "pending",
  reference: "R-001",
  detail: "確認座位",
  todo_id: null,
};
entities[0].ticket = {
  status: "ready",
  reference: "T-001",
  detail: "電子票已備妥",
  todo_id: null,
};
entities[0].readiness = {
  kind: "document",
  status: "action_needed",
  detail: "攜帶訂位證明",
  todo_id: null,
};
entities[0].notes = ["保留關係成員的原始指示"];
entities[0].actions = [
  {
    id: "action:member-map",
    kind: "map",
    label: "Exact member map",
    url: "https://example.com/member-map?exact=1",
  },
];

export const relationshipStateCanonicalTrip: CanonicalTrip = {
  schema_version: "canonical-trip.v3",
  id: "semantic:trip:relationship-state",
  title: "Relationship and state semantics",
  start_date: day.date,
  end_date: day.date,
  timezone: "Asia/Tokyo",
  geography: ["Osaka"],
  days: [day],
  entities,
  relationships: [
    {
      id: "semantic:relationship:reading-order",
      type: "sequence",
      member_entity_ids: [entities[7].id, entities[6].id, entities[4].id],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: null,
    },
    {
      id: "semantic:relationship:alternatives",
      type: "alternative",
      member_entity_ids: [entities[0].id, entities[1].id],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: null,
    },
    {
      id: "semantic:relationship:rain-condition",
      type: "conditional",
      member_entity_ids: [entities[2].id],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: "下雨時",
    },
    {
      id: "semantic:relationship:fallback",
      type: "fallback",
      member_entity_ids: [entities[0].id, entities[1].id, entities[3].id],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: null,
    },
    {
      id: "semantic:relationship:free-time-children",
      type: "parent_child",
      member_entity_ids: [],
      parent_entity_id: entities[4].id,
      child_entity_ids: [entities[5].id],
      condition: null,
    },
  ],
  supporting_items: [],
};
