import { days, trip } from "../../tripData";
import type { GoldenDay, GoldenEvent, GoldenPlace } from "../../tripData";
import type {
  CanonicalEntity,
  CanonicalTrip,
  SemanticType,
  TripAction,
  TripTime,
} from "../../domain/trip/types";

const dayId = (date: string) => `golden:day:${date}`;

const authoritativeMapUrls = new Map([
  [
    "Aloft Osaka Dojima",
    "https://www.google.com/maps/search/?api=1&query=Aloft%20Osaka%20Dojima%20Osaka",
  ],
  [
    "Museum of Spatial Art OSAKA",
    "https://www.google.com/maps/search/?api=1&query=Museum%20of%20Spatial%20Art%20OSAKA%20%E6%A3%AE%E4%B9%8B%E5%AE%AE",
  ],
  [
    "清次郎 北新地店",
    "https://www.google.com/maps/search/?api=1&query=%E7%82%AD%E7%81%AB%E7%84%BC%E8%82%89%20%E6%B8%85%E6%AC%A1%E9%83%8E%20%E5%8C%97%E6%96%B0%E5%9C%B0%E5%BA%97",
  ],
  [
    "Universal Studios Japan",
    "https://www.google.com/maps/search/?api=1&query=Universal%20Studios%20Japan",
  ],
]);

function canonicalTime(rawTime?: string | null): TripTime {
  if (/^\d{2}:\d{2}$/.test(rawTime ?? "")) {
    return {
      kind: "exact",
      start: rawTime ?? null,
      end: null,
      daypart: null,
      raw_text: rawTime ?? null,
      crosses_midnight: false,
    };
  }
  if (rawTime === "ALL DAY") {
    return {
      kind: "all_day",
      start: null,
      end: null,
      daypart: null,
      raw_text: rawTime,
      crosses_midnight: false,
    };
  }
  const daypart =
    rawTime === "午後"
      ? "afternoon"
      : rawTime === "晚上"
        ? "evening"
        : rawTime === "白天"
          ? "unknown"
          : null;
  return {
    kind: daypart ? "daypart" : "none",
    start: null,
    end: null,
    daypart,
    raw_text: rawTime ?? null,
    crosses_midnight: false,
  };
}

function dependencyFor(
  title: string,
  status?: string,
): Pick<CanonicalEntity, "reservation" | "ticket" | "readiness"> {
  const reservationTodoIds = new Map([
    ["Aloft Osaka Dojima", "hotel"],
    ["JX822 桃園起飛", "flights"],
    ["JX821 關西起飛", "flights"],
    ["Museum of Spatial Art OSAKA", "museum"],
    ["清次郎 北新地店", "seijiro"],
    ["東映太秦映画村 導覽", "toei-tour"],
  ]);
  if (title === "Universal Studios Japan") {
    return {
      reservation: null,
      ticket: {
        status: "action_needed",
        reference: null,
        detail: status ?? null,
        todo_id: "usj-ticket",
      },
      readiness: {
        kind: "ticket",
        status: "action_needed",
        detail: "USJ 門票／事前票券",
        todo_id: "usj-ticket",
      },
    };
  }
  const todoId = reservationTodoIds.get(title);
  if (!todoId) return { reservation: null, ticket: null, readiness: null };
  return {
    reservation: {
      status: "confirmed",
      reference: null,
      detail: status ?? null,
      todo_id: todoId,
    },
    ticket: null,
    readiness: {
      kind: "reservation",
      status: "ready",
      detail: status ?? null,
      todo_id: todoId,
    },
  };
}

function canonicalEntity(
  day: GoldenDay,
  event: GoldenEvent,
  index: number,
): CanonicalEntity {
  const isTransitConnector = Boolean(event.transit);
  const title = isTransitConnector ? event.transit! : event.title!;
  const id = `golden:entity:${day.date}:${index + 1}`;
  const exactMapUrl = event.map?.startsWith("https://")
    ? event.map
    : (authoritativeMapUrls.get(title) ?? null);
  const actions: TripAction[] = [];
  if (exactMapUrl) {
    actions.push({
      id: `${id}:map`,
      kind: "map",
      label: "Directions",
      url: exactMapUrl,
    });
  }
  if (event.tabelog) {
    actions.push({
      id: `${id}:restaurant`,
      kind: "restaurant",
      label: "食べログ",
      url: event.tabelog,
    });
  }
  const dependency = dependencyFor(title, event.status);

  return {
    id,
    day_id: dayId(day.date),
    semantic_type: isTransitConnector
      ? "transit"
      : ((
          {
            hotel: "accommodation",
            work: "activity",
            transport: "transit",
          } as Record<string, SemanticType>
        )[event.type ?? ""] ??
        (event.type as SemanticType | undefined) ??
        "unknown"),
    title,
    place: {
      name: event.map ? (exactMapUrl ? title : event.map) : null,
      address: null,
      url: exactMapUrl,
      unresolved: false,
    },
    time: canonicalTime(event.time),
    state: {
      optional: false,
      tentative: false,
      flexible: Boolean(event.flexible),
      unresolved: false,
    },
    ...dependency,
    notes: [event.meta, event.note, event.tip].filter((note): note is string =>
      Boolean(note),
    ),
    actions,
    provenance: {
      origin: "legacy_unavailable",
      overridden_fields: [],
      source_id: null,
      locator_refs: [],
    },
  };
}

function optionalEntity(
  day: GoldenDay,
  place: GoldenPlace,
  index: number,
): CanonicalEntity {
  const id = `golden:entity:${day.date}:optional-${index + 1}`;
  return {
    id,
    day_id: dayId(day.date),
    semantic_type: "activity",
    title: place.name,
    place: {
      name: place.name,
      address: null,
      url: place.map,
      unresolved: false,
    },
    time: canonicalTime(null),
    state: {
      optional: true,
      tentative: false,
      flexible: false,
      unresolved: false,
    },
    reservation: null,
    ticket: null,
    readiness: null,
    notes: [],
    actions: [
      { id: `${id}:map`, kind: "map", label: "Directions", url: place.map },
    ],
    provenance: {
      origin: "legacy_unavailable",
      overridden_fields: [],
      source_id: null,
      locator_refs: [],
    },
  };
}

const canonicalDays = days.map((day, sourceOrder) => ({
  id: dayId(day.date),
  date: day.date,
  source_order: sourceOrder,
  label: day.label,
  title: day.title,
  subtitle: day.subtitle,
  leave_by: day.leaveBy ?? null,
}));

const entitiesByDay = days.map((day) => {
  const primary = day.events.map((event, index) =>
    canonicalEntity(day, event, index),
  );
  const optional = (day.optional ?? []).map((place, index) =>
    optionalEntity(day, place, index),
  );
  return [...primary, ...optional];
});

export const goldenOsakaCanonicalTrip: CanonicalTrip = {
  schema_version: "canonical-trip.v3",
  id: "golden:osaka-2026",
  title: trip.title,
  start_date: days[0].date,
  end_date: days.at(-1)!.date,
  timezone: "Asia/Tokyo",
  geography: ["大阪", "宇治", "太秦"],
  days: canonicalDays,
  entities: entitiesByDay.flat(),
  relationships: entitiesByDay.flatMap((entities, index) => {
    const memberEntityIds = entities
      .filter((entity) => !entity.state.optional)
      .map((entity) => entity.id);
    return memberEntityIds.length >= 2
      ? [
          {
            id: `golden:relationship:sequence:${days[index].date}`,
            type: "sequence" as const,
            member_entity_ids: memberEntityIds,
            parent_entity_id: null,
            child_entity_ids: [],
            condition: null,
          },
        ]
      : [];
  }),
  supporting_items: [],
};
