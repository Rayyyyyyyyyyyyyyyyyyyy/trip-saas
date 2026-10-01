import type {
  CanonicalEntity,
  CanonicalTrip,
  SemanticType,
} from "../../../src/domain/trip/types";

const dayId = "seoul:day:6-26";

function seoulEntity({
  id,
  title,
  semanticType,
  placeName = null,
  flexible = false,
  optional = false,
  tentative = false,
}: {
  id: string;
  title: string;
  semanticType: SemanticType;
  placeName?: string | null;
  flexible?: boolean;
  optional?: boolean;
  tentative?: boolean;
}): CanonicalEntity {
  return {
    id,
    day_id: dayId,
    semantic_type: semanticType,
    title,
    place: {
      name: placeName,
      address: null,
      url: null,
      unresolved: false,
    },
    time: {
      kind: "none",
      start: null,
      end: null,
      daypart: null,
      raw_text: null,
      crosses_midnight: false,
    },
    state: {
      optional,
      tentative,
      flexible,
      unresolved: false,
    },
    reservation: null,
    ticket: null,
    readiness: null,
    notes: [],
    actions: [],
    provenance: {
      origin: "source",
      overridden_fields: [],
      source_id: "source:external-markdown-001",
      locator_refs: [`source:${id}`],
    },
  };
}

const freeTime = seoulEntity({
  id: "seoul:entity:free-time",
  title: "自由活動",
  semanticType: "free_time",
  flexible: true,
  optional: true,
});
const friedChicken = seoulEntity({
  id: "seoul:entity:fried-chicken",
  title: "노랑통닭 명동점 (炸雞)",
  semanticType: "restaurant",
  placeName: "노랑통닭 명동점",
  flexible: true,
  optional: true,
  tentative: true,
});
const pizza = seoulEntity({
  id: "seoul:entity:pizza",
  title: "no more pizza",
  semanticType: "restaurant",
  placeName: "no more pizza",
  flexible: true,
  optional: true,
  tentative: true,
});

/** Sample #23 semantics used to verify Result clarity at both viewport classes. */
export const seoulResultClarityCanonicalTrip: CanonicalTrip = {
  schema_version: "canonical-trip.v3",
  id: "seoul:trip:result-clarity",
  title: "韓國 - 首爾",
  start_date: null,
  end_date: null,
  timezone: "Asia/Seoul",
  geography: ["首爾"],
  days: [
    {
      id: dayId,
      date: null,
      source_order: 0,
      label: "第二天 (6/26)",
      title: "第二天 (6/26)",
      subtitle: null,
      leave_by: null,
    },
  ],
  entities: [freeTime, friedChicken, pizza],
  relationships: [
    {
      id: "seoul:relationship:late-snack-choice",
      type: "alternative",
      member_entity_ids: [friedChicken.id, pizza.id],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: null,
    },
  ],
  supporting_items: [
    {
      id: "seoul:support:arex-timetable-text",
      kind: "timetable",
      text: "班次：機場快線時刻表",
      url: "https://www.airportrailroad.com/train/express/info",
      unresolved: false,
      group: null,
    },
    {
      id: "seoul:support:missing-airport-timetable",
      kind: "asset",
      text: "![image.png](image.png)",
      url: null,
      unresolved: true,
      group: null,
    },
    {
      id: "seoul:support:station-timetable-text",
      kind: "note",
      text: "首爾車站的時刻表：",
      url: null,
      unresolved: false,
      group: null,
    },
    {
      id: "seoul:support:missing-station-timetable",
      kind: "asset",
      text: "![image.png](image%201.png)",
      url: null,
      unresolved: true,
      group: null,
    },
    {
      id: "seoul:support:resolved-no-url",
      kind: "asset",
      text: "已匯入的首爾交通參考",
      url: null,
      unresolved: false,
      group: null,
    },
  ],
};
