import { projectedLeaves } from "../fixtures/semantics/projectedLeaves";
import { describe, expect, it } from "vitest";
import {
  createTripPresentation,
  verifySupportingPlacement,
} from "../../src/features/result/createTripPresentation";
import { goldenOsakaCanonicalTrip } from "../../src/fixtures/golden/osakaCanonicalTrip";
import type { TimeKind, TripTime } from "../../src/domain/trip/types";

describe("Golden Presentation Projection", () => {
  const presentation = createTripPresentation(goldenOsakaCanonicalTrip);

  it("projects Overview identity, flights, stay, and all days", () => {
    expect(presentation.trip).toMatchObject({
      title: "關西",
      startDate: "2026-09-10",
      endDate: "2026-09-15",
      timezone: "Asia/Tokyo",
    });
    expect(presentation.overview.flights.map((flight) => flight.title)).toEqual(
      ["JX822 桃園起飛", "JX821 關西起飛"],
    );
    expect(presentation.overview.accommodations[0]!.title).toBe(
      "Aloft Osaka Dojima",
    );
    expect(presentation.overview.days).toHaveLength(6);
    expect(presentation.supportingItems).toEqual([]);
    expect(presentation.supportingGroups).toEqual([]);
  });

  it("projects Day anchors, transit, flexible, and optional roles", () => {
    const uji = presentation.days.find((day) => day.date === "2026-09-12")!;

    expect(uji.leaveBy).toBe("17:50");
    expect(uji.fixedAnchors.map((entity) => entity.title)).toContain(
      "清次郎 北新地店",
    );
    expect(
      projectedLeaves(uji.items).find((entity) => entity.title === "約 58 min")!
        .role,
    ).toBe("transit_connector");
    expect(
      projectedLeaves(uji.items).find(
        (entity) => entity.title === "喫茶 コンソラ",
      )!.role,
    ).toBe("flexible_space");
    expect(projectedLeaves(uji.optional).map((entity) => entity.title)).toEqual(
      ["宇治川", "宇治中之島", "朝霧通", "宇治上神社", "平等院"],
    );
  });

  it("passes an exact source map URL through unchanged as the map action", () => {
    const consola = projectedLeaves(
      presentation.days.find((day) => day.date === "2026-09-12")!.items,
    ).find((entity) => entity.title === "喫茶 コンソラ")!;

    expect(consola.mapAction).toEqual({
      kind: "source",
      url: "https://www.google.com/maps/search/?api=1&query=%E5%96%AB%E8%8C%B6%20%E3%82%B3%E3%83%B3%E3%82%BD%E3%83%A9%20%E5%AE%87%E6%B2%BB",
      query: null,
      label: "地圖",
      accessibleName: "開啟「喫茶 コンソラ」的地圖連結",
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(consola.actions.some((action) => action.kind === "map")).toBe(false);
  });

  it.each([
    [
      "exact",
      { start: "10:30", end: null, daypart: null, raw_text: "10:30" },
      "10:30",
      "fixed",
    ],
    [
      "approximate",
      { start: "10:30", end: null, daypart: null, raw_text: "10:30 頃" },
      "約 10:30",
      "normal",
    ],
    [
      "range",
      { start: "10:30", end: "12:00", daypart: null, raw_text: null },
      "10:30–12:00",
      "fixed",
    ],
    [
      "daypart",
      { start: null, end: null, daypart: "morning", raw_text: null },
      "上午",
      "normal",
    ],
    [
      "none",
      { start: null, end: null, daypart: null, raw_text: null },
      null,
      "normal",
    ],
    [
      "open_ended",
      { start: "18:30", end: null, daypart: null, raw_text: "18:30~" },
      "18:30 起",
      "fixed",
    ],
    [
      "all_day",
      { start: null, end: null, daypart: null, raw_text: null },
      "全天",
      "fixed",
    ],
  ])(
    "preserves %s time precision without inventing an exact value",
    (kind, values, expectedLabel, expectedPriority) => {
      const fixture = structuredClone(goldenOsakaCanonicalTrip);
      fixture.entities[0].time = {
        kind: kind as TimeKind,
        ...values,
        crosses_midnight: false,
      } as TripTime;

      const projected = projectedLeaves(
        createTripPresentation(fixture).days[0]!.items,
      )[0]!;

      expect(projected.time).toMatchObject({
        kind,
        label: expectedLabel,
        rawText: values.raw_text,
        isUntimed: kind === "none",
      });
      expect(projected.anchorPriority).toBe(expectedPriority);
    },
  );

  it("preserves an ambiguous original time without promoting it to a known start or anchor", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    fixture.entities[0].time = {
      kind: "none",
      start: null,
      end: null,
      daypart: null,
      raw_text: "8點",
      crosses_midnight: false,
    };
    const day = createTripPresentation(fixture).days[0];
    const entity = projectedLeaves(day.items)[0];
    expect(entity.time).toMatchObject({
      label: "8點",
      rawText: "8點",
      kind: "none",
      start: null,
      end: null,
      hasKnownStart: false,
      hasKnownEnd: false,
      isUntimed: true,
    });
    expect(entity.anchorPriority).toBe("normal");
    expect(day.fixedAnchors.some((anchor) => anchor.id === entity.id)).toBe(
      false,
    );
  });

  it("marks a cross-midnight range without flattening it into a same-day range", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    fixture.entities[0].time = {
      kind: "range",
      start: "23:30",
      end: "01:00",
      daypart: null,
      raw_text: "23:30–翌日 01:00",
      crosses_midnight: true,
    };

    const projected = projectedLeaves(
      createTripPresentation(fixture).days[0]!.items,
    )[0]!;

    expect(projected.time).toMatchObject({
      label: "23:30–翌日 01:00",
      crossesMidnight: true,
      hasKnownStart: true,
      hasKnownEnd: true,
    });
    expect(projected.role).toBe("fixed_anchor");
  });

  it("preserves optional, tentative, and flexible state as presentation modifiers", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    fixture.entities[0].semantic_type = "free_time";
    fixture.entities[0].state = {
      optional: true,
      tentative: true,
      flexible: true,
      unresolved: false,
    };

    const projected = projectedLeaves(
      createTripPresentation(fixture).days[0].optional,
    )[0];

    expect(projected.role).toBe("optional");
    expect(projected.anchorPriority).toBe("normal");
    expect(projected.modifiers).toEqual(["optional", "tentative", "flexible"]);
  });

  it("keeps transit, dependency, notes, and unresolved presentation distinct", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    const entity = fixture.entities[0];
    entity.semantic_type = "transit";
    entity.state.unresolved = true;
    entity.place = {
      name: "地址待確認",
      address: "大阪市內",
      url: null,
      unresolved: true,
    };
    entity.actions = [];
    entity.reservation = {
      status: "pending",
      reference: "R-001",
      detail: "等待確認",
      todo_id: "todo:reservation",
    };
    entity.ticket = {
      status: "ready",
      reference: "T-001",
      detail: "電子票",
      todo_id: "todo:ticket",
    };
    entity.readiness = {
      kind: "document",
      status: "action_needed",
      detail: "護照影本",
      todo_id: "todo:document",
    };
    entity.notes = ["請保留原始指示"];

    const projected = projectedLeaves(
      createTripPresentation(fixture).days[0].items,
    )[0];

    expect(projected.role).toBe("fixed_anchor");
    expect(projected.dependencies.map((dependency) => dependency.type)).toEqual(
      ["reservation", "ticket", "readiness"],
    );
    expect(projected.notes).toEqual(["請保留原始指示"]);
    expect(projected.unresolved).toEqual({
      entity: true,
      place: true,
      any: true,
    });
    expect(projected.actions).toEqual([]);
  });

  it("builds a labeled map search from verbatim place text when the source has no URL", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    const entity = fixture.entities[0];
    entity.title = "吃點東西";
    entity.place = {
      name: "노랑통닭 명동점",
      address: null,
      url: null,
      unresolved: false,
    };
    entity.actions = [];

    const projected = projectedLeaves(
      createTripPresentation(fixture).days[0]!.items,
    )[0]!;

    expect(projected.mapAction).toEqual({
      kind: "search",
      url: "https://www.google.com/maps/search/?api=1&query=%EB%85%B8%EB%9E%91%ED%86%B5%EB%8B%AD%20%EB%AA%85%EB%8F%99%EC%A0%90",
      query: "노랑통닭 명동점",
      label: "搜尋 Google 地圖",
      accessibleName: "以「노랑통닭 명동점」搜尋 Google 地圖",
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(projected.placeLine).toBe("노랑통닭 명동점");
  });

  it("preserves consecutive whitespace in the confirmed place search query", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    const entity = fixture.entities[0];
    entity.title = "吃點東西";
    entity.place = {
      name: "노랑통닭  명동점",
      address: null,
      url: null,
      unresolved: false,
    };
    entity.actions = [];

    const projected = projectedLeaves(
      createTripPresentation(fixture).days[0]!.items,
    )[0]!;

    expect(projected.mapAction).toMatchObject({
      kind: "search",
      query: "노랑통닭  명동점",
      url: "https://www.google.com/maps/search/?api=1&query=%EB%85%B8%EB%9E%91%ED%86%B5%EB%8B%AD%20%20%EB%AA%85%EB%8F%99%EC%A0%90",
    });
    expect(projected.placeLine).toBe("노랑통닭  명동점");
  });

  it("uses the verbatim address when the place name contains only whitespace", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    const entity = fixture.entities[0];
    entity.title = "醫美";
    entity.place = {
      name: "   ",
      address: "首爾特別市  瑞草區",
      url: null,
      unresolved: false,
    };
    entity.actions = [];

    const projected = projectedLeaves(
      createTripPresentation(fixture).days[0]!.items,
    )[0]!;

    expect(projected.mapAction).toMatchObject({
      kind: "search",
      query: "首爾特別市  瑞草區",
      url: "https://www.google.com/maps/search/?api=1&query=%E9%A6%96%E7%88%BE%E7%89%B9%E5%88%A5%E5%B8%82%20%20%E7%91%9E%E8%8D%89%E5%8D%80",
    });
    expect(projected.placeLine).toBe("首爾特別市  瑞草區");
  });

  it("offers no map action without place text or a source URL", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    const entity = fixture.entities[0];
    entity.place = { name: null, address: null, url: null, unresolved: false };
    entity.actions = [];

    const projected = projectedLeaves(
      createTripPresentation(fixture).days[0]!.items,
    )[0]!;

    expect(projected.mapAction).toBeNull();
    expect(projected.placeLine).toBeNull();
  });

  it("does not repeat place text the title already contains", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    const entity = fixture.entities[0];
    entity.title = "노랑통닭  명동점 (炸雞)";
    entity.place = {
      name: "노랑통닭 명동점",
      address: null,
      url: null,
      unresolved: false,
    };

    const projected = projectedLeaves(
      createTripPresentation(fixture).days[0]!.items,
    )[0]!;

    expect(projected.placeLine).toBeNull();
    expect(projected.mapAction?.kind).toBe("search");
  });

  it.each([
    [{ optional: true, tentative: true, flexible: true }, "tentative"],
    [{ optional: true, tentative: false, flexible: true }, "optional"],
    [{ optional: false, tentative: false, flexible: true }, null],
  ] as const)(
    "shows at most one state label for a standalone entity (%o)",
    (state, expected) => {
      const fixture = structuredClone(goldenOsakaCanonicalTrip);
      fixture.entities[0].state = { ...state, unresolved: false };
      const day = createTripPresentation(fixture).days[0]!;
      const projected = projectedLeaves([...day.items, ...day.optional]).find(
        (entity) => entity.id === fixture.entities[0].id,
      )!;

      expect(projected.stateLabel).toBe(expected);
    },
  );

  it("drops state labels for members of a choose-one group", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    const [first, second] = fixture.entities.filter(
      (entity) => entity.day_id === fixture.entities[0].day_id,
    );
    for (const entity of [first!, second!])
      entity.state = {
        optional: false,
        tentative: true,
        flexible: true,
        unresolved: false,
      };
    fixture.relationships.push({
      id: "rel:choose-dinner",
      type: "alternative",
      member_entity_ids: [first!.id, second!.id],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: null,
    });

    const leaves = projectedLeaves(
      createTripPresentation(fixture).days[0]!.items,
    );

    expect(
      leaves
        .filter((entity) => [first!.id, second!.id].includes(entity.id))
        .map((entity) => entity.stateLabel),
    ).toEqual([null, null]);
  });

  it("projects supporting references without synthesizing absent actions", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    fixture.supporting_items = [
      {
        id: "support:map",
        kind: "asset",
        text: "場內地圖",
        url: "https://example.com/venue-map",
        unresolved: false,
        group: null,
      },
      {
        id: "support:missing",
        kind: "asset",
        text: "![image.png](image%201.png)",
        url: null,
        unresolved: true,
        group: null,
      },
      {
        id: "support:resolved-no-url",
        kind: "asset",
        text: "已匯入的場內交通參考",
        url: null,
        unresolved: false,
        group: null,
      },
    ];

    const presentation = createTripPresentation(fixture);

    expect(presentation.supportingItems).toHaveLength(2);
    expect(presentation.supportingItems[0]).toMatchObject({
      role: "supporting_reference",
      text: "場內地圖",
      action: {
        url: "https://example.com/venue-map",
        target: "_blank",
        rel: "noopener noreferrer",
      },
    });
    // The unimported image stays accounted for but renders no placeholder.
    expect(presentation.unrenderedSupportingIds).toEqual(["support:missing"]);
    expect(presentation.supportingItems[1]).toMatchObject({
      id: "support:resolved-no-url",
      displayTitle: "已匯入的場內交通參考",
      unresolved: false,
      action: null,
    });
    expect(fixture.supporting_items[1].text).toBe(
      "![image.png](image%201.png)",
    );
  });

  it("projects retained supporting items into ordered groups plus the ungrouped region", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    const item = (
      id: string,
      group: { id: string; label: string; order: number } | null,
    ) => ({
      id,
      kind: "note" as const,
      text: id,
      url: null,
      unresolved: false,
      group,
    });
    fixture.supporting_items = [
      item("support:food:1", {
        id: "sheet:food",
        label: "美食清單",
        order: 8,
      }),
      item("support:ungrouped", null),
      item("support:packing:1", {
        id: "sheet:packing",
        label: "行李清單",
        order: 2,
      }),
      item("support:food:2", {
        id: "sheet:food",
        label: "美食清單",
        order: 8,
      }),
      item("support:packing:2", {
        id: "sheet:packing",
        label: "行李清單",
        order: 2,
      }),
      item("support:food:3", {
        id: "sheet:food",
        label: "美食清單",
        order: 8,
      }),
    ];

    const presentation = createTripPresentation(fixture);

    expect(presentation.supportingItems.map((item) => item.id)).toEqual([
      "support:ungrouped",
    ]);
    expect(
      presentation.supportingGroups.map(({ id, label, count, items }) => ({
        id,
        label,
        count,
        itemIds: items.map((item) => item.id),
      })),
    ).toEqual([
      {
        id: "sheet:packing",
        label: "行李清單",
        count: 2,
        itemIds: ["support:packing:1", "support:packing:2"],
      },
      {
        id: "sheet:food",
        label: "美食清單",
        count: 3,
        itemIds: ["support:food:1", "support:food:2", "support:food:3"],
      },
    ]);
  });

  it("fails supporting projection verification on missing or duplicate placement", () => {
    const item = {
      id: "support:first",
      role: "supporting_reference",
      kind: "note" as const,
      text: "First",
      displayTitle: "First",
      unresolved: false,
      unresolvedMessage: "這份資料還需要確認",
      action: null,
    };

    expect(() =>
      verifySupportingPlacement(
        ["support:first", "support:missing"],
        [item],
        [],
        [],
      ),
    ).toThrow(/exactly once/);
    expect(() =>
      verifySupportingPlacement(
        ["support:first"],
        [item],
        [
          {
            id: "sheet:duplicate",
            label: "Duplicate",
            order: 0,
            count: 1,
            items: [item],
          },
        ],
        [],
      ),
    ).toThrow(/exactly once/);
  });
});
