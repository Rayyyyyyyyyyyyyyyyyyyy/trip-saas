import { projectedLeaves } from "../fixtures/semantics/projectedLeaves";
import { describe, expect, it } from "vitest";
import { createTripPresentation } from "../../src/features/result/createTripPresentation";
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

  it("passes exact actions through unchanged", () => {
    const consola = projectedLeaves(
      presentation.days.find((day) => day.date === "2026-09-12")!.items,
    ).find((entity) => entity.title === "喫茶 コンソラ")!;

    expect(consola.actions[0]!.url).toBe(
      "https://www.google.com/maps/search/?api=1&query=%E5%96%AB%E8%8C%B6%20%E3%82%B3%E3%83%B3%E3%82%BD%E3%83%A9%20%E5%AE%87%E6%B2%BB",
    );
    expect(consola.actions[0]!).toMatchObject({
      target: "_blank",
      rel: "noopener noreferrer",
    });
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

  it("projects supporting references without synthesizing absent actions", () => {
    const fixture = structuredClone(goldenOsakaCanonicalTrip);
    fixture.supporting_items = [
      {
        id: "support:map",
        kind: "asset",
        text: "場內地圖",
        url: "https://example.com/venue-map",
        unresolved: false,
      },
      {
        id: "support:missing",
        kind: "asset",
        text: "![image.png](image%201.png)",
        url: null,
        unresolved: true,
      },
    ];

    const projected = createTripPresentation(fixture).supportingItems;

    expect(projected[0]).toMatchObject({
      role: "supporting_reference",
      text: "場內地圖",
      action: {
        url: "https://example.com/venue-map",
        target: "_blank",
        rel: "noopener noreferrer",
      },
    });
    expect(projected[1]).toMatchObject({
      unresolved: true,
      action: null,
      displayTitle: "圖片附件未提供",
      displayDetail: "image 1.png",
    });
    expect(fixture.supporting_items[1].text).toBe(
      "![image.png](image%201.png)",
    );
  });
});
