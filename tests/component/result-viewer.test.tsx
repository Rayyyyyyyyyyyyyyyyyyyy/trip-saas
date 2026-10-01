import { relationshipStateCanonicalTrip } from "../fixtures/semantics/relationshipStateSemantics";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CanonicalEntity, TripTime } from "../../src/domain/trip/types";
import {
  createTripPresentation,
  type TripPresentation,
} from "../../src/features/result/createTripPresentation";
import { ResultDay } from "../../src/features/result/ResultDay";
import { ResultDateRail } from "../../src/features/result/ResultDateRail";
import { ResultOverview } from "../../src/features/result/ResultOverview";
import { ResultViewer } from "../../src/features/result/ResultViewer";
import { validCanonicalTrip } from "../fixtures/contracts/validContracts";

function entity(
  id: string,
  title: string,
  time: TripTime,
  patch: Partial<CanonicalEntity> = {},
): CanonicalEntity {
  return {
    ...structuredClone(validCanonicalTrip.entities[0]),
    id,
    title,
    time,
    ...patch,
  };
}

const times: Array<[string, TripTime]> = [
  [
    "Exact event",
    {
      kind: "exact",
      start: "10:30",
      end: null,
      daypart: null,
      raw_text: "10:30",
      crosses_midnight: false,
    },
  ],
  [
    "Approximate event",
    {
      kind: "approximate",
      start: "11:00",
      end: null,
      daypart: null,
      raw_text: "約 11:00",
      crosses_midnight: false,
    },
  ],
  [
    "Range event",
    {
      kind: "range",
      start: "12:00",
      end: "13:30",
      daypart: null,
      raw_text: null,
      crosses_midnight: false,
    },
  ],
  [
    "Daypart event",
    {
      kind: "daypart",
      start: null,
      end: null,
      daypart: "afternoon",
      raw_text: null,
      crosses_midnight: false,
    },
  ],
  [
    "Untimed event",
    {
      kind: "none",
      start: null,
      end: null,
      daypart: null,
      raw_text: null,
      crosses_midnight: false,
    },
  ],
  [
    "Open event",
    {
      kind: "open_ended",
      start: "18:30",
      end: null,
      daypart: null,
      raw_text: "18:30~",
      crosses_midnight: false,
    },
  ],
  [
    "All day event",
    {
      kind: "all_day",
      start: null,
      end: null,
      daypart: null,
      raw_text: "全天",
      crosses_midnight: false,
    },
  ],
  [
    "Cross midnight event",
    {
      kind: "range",
      start: "23:30",
      end: "01:00",
      daypart: null,
      raw_text: "23:30–翌日 01:00",
      crosses_midnight: true,
    },
  ],
];

function stressPresentation(): TripPresentation {
  const trip = structuredClone(validCanonicalTrip);
  trip.entities = times.map(([title, time], index) =>
    entity(`entity:time:${index}`, title, time),
  );
  trip.entities.push(
    entity(
      "entity:transit",
      "27 min · JR",
      {
        kind: "none",
        start: null,
        end: null,
        daypart: null,
        raw_text: null,
        crosses_midnight: false,
      },
      { semantic_type: "transit" },
    ),
    entity(
      "entity:optional",
      "Optional free time",
      {
        kind: "none",
        start: null,
        end: null,
        daypart: null,
        raw_text: null,
        crosses_midnight: false,
      },
      {
        semantic_type: "free_time",
        state: {
          optional: true,
          tentative: true,
          flexible: true,
          unresolved: false,
        },
      },
    ),
    entity(
      "entity:unresolved",
      "Unresolved booking",
      {
        kind: "none",
        start: null,
        end: null,
        daypart: null,
        raw_text: null,
        crosses_midnight: false,
      },
      {
        place: {
          name: "Address-first place",
          address: "Unknown address",
          url: null,
          unresolved: true,
        },
        readiness: {
          kind: "reservation",
          status: "action_needed",
          detail: "Book it",
          todo_id: null,
        },
        state: {
          optional: false,
          tentative: false,
          flexible: false,
          unresolved: true,
        },
      },
    ),
  );
  trip.entities[0].actions = [
    {
      id: "action:exact",
      kind: "map",
      label: "Exact map",
      url: "https://example.com/exact-source-url",
    },
  ];
  trip.relationships = [
    {
      id: "relationship:alternative",
      type: "alternative",
      member_entity_ids: [trip.entities[0].id, trip.entities[1].id],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: null,
    },
  ];
  trip.supporting_items = [
    {
      id: "support:missing",
      kind: "asset",
      text: "![image.png](image%201.png)",
      url: null,
      unresolved: true,
      group: null,
    },
  ];
  return createTripPresentation(trip);
}

describe("source-agnostic Result UI", () => {
  it("shows a source-supported month/day without requiring or inventing a year", async () => {
    const trip = structuredClone(validCanonicalTrip);
    trip.start_date = null;
    trip.end_date = null;
    trip.days[0].date = null;
    trip.days[0].label = "第一天 (6/25)";
    trip.days[0].title = "第一天 (6/25)";

    render(
      <ResultViewer
        onShowHome={() => undefined}
        presentation={createTripPresentation(trip)}
      />,
    );

    expect(screen.getByText("6/25 — 6/25")).toBeVisible();
    expect(screen.queryByText(/日期未定/)).not.toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /第 1 天 · 6\/25/ }));
    expect(screen.getByRole("button", { name: /6\/25.*第一天/ })).toBeVisible();
    expect(trip.start_date).toBeNull();
    expect(trip.days[0].date).toBeNull();
  });

  it("renders presentation-only fallbacks for supported unknown trip and Day values", () => {
    const trip = structuredClone(validCanonicalTrip);
    trip.title = null;
    trip.start_date = null;
    trip.end_date = null;
    trip.timezone = null;
    trip.days[0].date = null;
    trip.days[0].label = null;
    trip.days[0].title = null;

    render(
      <ResultOverview
        onOpenDay={() => undefined}
        presentation={createTripPresentation(trip)}
      />,
    );

    expect(screen.getByRole("heading", { name: "未命名行程" })).toBeVisible();
    expect(screen.getAllByText(/日期未定/).length).toBeGreaterThan(0);
    expect(screen.getByText("當天行程")).toBeVisible();
    expect(trip.title).toBeNull();
    expect(trip.days[0].date).toBeNull();
  });

  it("keeps complete undated activities, flights, stays and optional actions reachable from Overview", async () => {
    const trip = structuredClone(validCanonicalTrip);
    const base = trip.entities[0];
    trip.entities = [
      {
        ...structuredClone(base),
        id: "entity:undated-activity",
        day_id: null,
        title: "Undated medical visit",
        place: {
          name: null,
          address: "SOURCE_ADDRESS_MARKER",
          url: null,
          unresolved: true,
        },
        notes: ["SOURCE_NOTE_MARKER"],
        actions: [
          {
            id: "action:undated-map",
            kind: "map",
            label: "查看地址",
            url: "https://maps.example.test/undated",
          },
        ],
      },
      {
        ...structuredClone(base),
        id: "entity:undated-flight",
        day_id: null,
        semantic_type: "flight",
        title: "Undated flight",
      },
      {
        ...structuredClone(base),
        id: "entity:undated-stay",
        day_id: null,
        semantic_type: "accommodation",
        title: "Undated stay",
      },
      {
        ...structuredClone(base),
        id: "entity:undated-option",
        day_id: null,
        title: "Undated optional stop",
        state: { ...base.state, optional: true },
      },
    ];

    render(
      <ResultOverview
        onOpenDay={() => undefined}
        presentation={createTripPresentation(trip)}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "未指定日期／旅程資訊" }),
    ).toBeVisible();
    const activity = document.querySelector(
      '[data-entity-id="entity:undated-activity"]',
    );
    expect(activity).toHaveTextContent("SOURCE_ADDRESS_MARKER");
    expect(activity).toHaveTextContent("SOURCE_NOTE_MARKER");
    expect(within(activity as HTMLElement).getByRole("link")).toHaveAttribute(
      "href",
      "https://maps.example.test/undated",
    );
    expect(
      document.querySelector('[data-entity-id="entity:undated-flight"]'),
    ).toBeVisible();
    expect(
      document.querySelector('[data-entity-id="entity:undated-stay"]'),
    ).toBeVisible();

    await userEvent.setup().click(screen.getByText("未指定日期的可選項目"));
    expect(
      document.querySelector('[data-entity-id="entity:undated-option"]'),
    ).toBeVisible();
  });

  it("shows cross-region sequence context without duplicating primary entities", () => {
    const trip = structuredClone(validCanonicalTrip);
    const undated = {
      ...structuredClone(trip.entities[0]),
      id: "entity:undated-sequence-member",
      day_id: null,
      title: "Undated transfer",
    };
    trip.entities.push(undated);
    trip.relationships = [
      {
        id: "relationship:cross-region-sequence",
        type: "sequence",
        member_entity_ids: [trip.entities[0].id, undated.id],
        parent_entity_id: null,
        child_entity_ids: [],
        condition: null,
      },
    ];
    const presentation = createTripPresentation(trip);
    const { rerender } = render(
      <ResultOverview
        onOpenDay={() => undefined}
        presentation={presentation}
      />,
    );

    expect(
      document.querySelector(
        '[data-relationship-id="relationship:cross-region-sequence"]',
      ),
    ).toHaveTextContent("Arrive → Undated transfer");
    expect(
      document.querySelectorAll(
        '[data-entity-id="entity:undated-sequence-member"]',
      ),
    ).toHaveLength(1);

    rerender(
      <ResultDay
        activeDayId={trip.days[0].id}
        onOpenDay={() => undefined}
        presentation={presentation}
      />,
    );
    expect(
      document.querySelector(
        '[data-relationship-id="relationship:cross-region-sequence"]',
      ),
    ).toHaveTextContent("Arrive → Undated transfer");
    expect(
      document.querySelectorAll('[data-entity-id="entity:arrival"]'),
    ).toHaveLength(1);
  });

  it("renders nested relationships once with complete member semantics and optional separation", async () => {
    const presentation = createTripPresentation(relationshipStateCanonicalTrip);
    const { container } = render(
      <ResultDay
        activeDayId={presentation.days[0].id}
        presentation={presentation}
        onOpenDay={() => undefined}
      />,
    );
    const optionalSummary = screen.getByRole("button", {
      name: "還有體力的話",
    });
    await userEvent.setup().click(optionalSummary);
    const optionalDisclosure = screen.getByRole("region", {
      name: "還有體力的話",
    });
    expect(optionalSummary).toHaveAttribute(
      "aria-controls",
      optionalDisclosure.id,
    );
    expect(optionalDisclosure).toHaveAttribute(
      "aria-labelledby",
      optionalSummary.id,
    );
    for (const entity of relationshipStateCanonicalTrip.entities) {
      expect(
        container.querySelectorAll(`[data-entity-id="${entity.id}"]`),
      ).toHaveLength(1);
    }
    const planA = screen
      .getByRole("heading", { name: "Plan A" })
      .closest("article")!;
    // Plan A is a choose-one member: the group heading carries its optional/
    // tentative meaning, so the member repeats no state label.
    for (const text of ["可選", "暫定", "彈性"]) {
      expect(planA).not.toHaveTextContent(text);
    }
    for (const text of [
      "23:30–翌日 01:00",
      "待確認",
      "保留關係成員的原始指示",
      "大阪市內地址待確認",
      "確認座位",
      "電子票已備妥",
      "攜帶訂位證明",
    ]) {
      expect(planA).toHaveTextContent(text);
    }
    expect(within(planA).getByRole("link")).toHaveAttribute(
      "href",
      "https://example.com/member-map?exact=1",
    );
    expect(within(planA).getByRole("link")).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(
      within(
        screen.getByRole("region", { name: "主要行程時間線" }),
      ).queryByRole("heading", { name: "Plan A" }),
    ).toBeNull();
    expect(screen.getByRole("region", { name: "備用方案" })).toContainElement(
      screen.getByRole("region", { name: "選一個" }),
    );
  });

  it("places mobile readiness and critical anchors before the day journey index", () => {
    render(
      <ResultOverview
        onOpenDay={() => undefined}
        presentation={stressPresentation()}
      />,
    );

    const tripIdentity = screen.getByRole("heading", {
      level: 1,
      name: "One day",
    });
    const readiness = screen.getByText("出發前要處理");
    const criticalAnchors = screen.getByText("不能錯過的時間");
    const dayIndex = screen.getByRole("heading", { name: "每一天" });
    const overview = screen.getByRole("main", { name: "行程總覽" });

    expect(overview).toHaveClass("max-w-[680px]");
    expect(screen.getByText("09/10 — 09/10")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /第 1 天 · 09\/10/ }),
    ).toBeVisible();

    expect(
      tripIdentity.compareDocumentPosition(readiness) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      readiness.compareDocumentPosition(dayIndex) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      criticalAnchors.compareDocumentPosition(dayIndex) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("scrolls the active date into view on initial and programmatic changes", () => {
    const scrollIntoView = vi.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView",
    );
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const firstDay = stressPresentation().days[0];
      const secondDay = {
        ...firstDay,
        id: "day:second",
        date: "2026-09-11",
        label: "Second day",
        title: "Second day",
      };
      const { rerender } = render(
        <ResultDateRail
          activeDayId={firstDay.id}
          days={[firstDay, secondDay]}
          onOpenDay={() => undefined}
        />,
      );

      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "nearest",
        inline: "nearest",
      });
      scrollIntoView.mockClear();

      rerender(
        <ResultDateRail
          activeDayId={secondDay.id}
          days={[firstDay, secondDay]}
          onOpenDay={() => undefined}
        />,
      );

      const selectedDate = screen
        .getByText("09/11")
        .closest("button") as HTMLButtonElement;
      expect(selectedDate).toHaveAttribute("aria-current", "date");
      expect(scrollIntoView).toHaveBeenCalledWith({
        block: "nearest",
        inline: "nearest",
      });
      expect(scrollIntoView.mock.contexts.at(-1)).toBe(selectedDate);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(
          HTMLElement.prototype,
          "scrollIntoView",
          originalDescriptor,
        );
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
    }
  });

  it("omits absent Overview sections and exposes only Overview/Day navigation", async () => {
    const user = userEvent.setup();
    render(
      <ResultViewer
        onShowHome={() => undefined}
        presentation={createTripPresentation(validCanonicalTrip)}
      />,
    );

    expect(screen.getByRole("heading", { name: "One day" })).toBeVisible();
    expect(screen.queryByText("航班")).not.toBeInTheDocument();
    expect(screen.queryByText("住宿")).not.toBeInTheDocument();
    expect(screen.queryByText("Today")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /第 1 天/ }));
    expect(screen.getByRole("heading", { name: "Arrival" })).toBeVisible();
    expect(screen.queryByText("時間未定")).not.toBeInTheDocument();
  });

  it("renders all precision, optional, transit, relationship, readiness, unresolved, and safe-action treatments", async () => {
    const user = userEvent.setup();
    const presentation = stressPresentation();
    render(
      <ResultDay
        activeDayId={presentation.days[0].id}
        onOpenDay={() => undefined}
        presentation={presentation}
      />,
    );

    for (const label of [
      "10:30",
      "約 11:00",
      "12:00–13:30",
      "下午",
      "18:30 起",
      "全天",
      "23:30–翌日 01:00",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText("時間未定")).not.toBeInTheDocument();
    expect(screen.getByText("27 min · JR")).toBeVisible();
    expect(screen.getByText("選一個")).toBeVisible();
    expect(screen.getByText(/需要處理/)).toBeVisible();
    expect(screen.getAllByText("待確認").length).toBeGreaterThan(0);
    // An unimported image leaves no frame, notice, or raw Markdown behind.
    expect(screen.queryByText("圖片附件未提供")).not.toBeInTheDocument();
    expect(screen.queryByText("image 1.png")).not.toBeInTheDocument();
    expect(
      screen.queryByText("![image.png](image%201.png)"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByText("還有體力的話"));
    expect(screen.getByText("Optional free time")).toBeVisible();

    const exactLink = screen.getByRole("link", {
      name: "開啟「Exact event」的地圖連結",
    });
    expect(exactLink).toHaveAttribute(
      "href",
      "https://example.com/exact-source-url",
    );
    expect(exactLink).toHaveAttribute("target", "_blank");
    expect(exactLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps supported time beside the title and leaves intentionally untimed content unpositioned", () => {
    const trip = structuredClone(validCanonicalTrip);
    trip.entities = [
      entity("entity:timed", "Timed title", times[0]![1]),
      entity("entity:untimed", "Untimed title", times[4]![1]),
    ];
    const presentation = createTripPresentation(trip);

    render(
      <ResultDay
        activeDayId={presentation.days[0].id}
        onOpenDay={() => undefined}
        presentation={presentation}
      />,
    );

    const timedHeading = screen.getByRole("heading", { name: "Timed title" });
    expect(timedHeading.parentElement).toHaveTextContent("10:30Timed title");

    const untimedArticle = screen
      .getByRole("heading", { name: "Untimed title" })
      .closest("article");
    expect(untimedArticle).not.toHaveTextContent("時間未定");
  });

  it.each([390, 1280])(
    "renders supporting groups as accessible default-collapsed keyboard disclosures at %ipx",
    async (width) => {
      const originalWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: width,
      });
      try {
        const trip = structuredClone(validCanonicalTrip);
        trip.supporting_items = [
          {
            id: "support:ungrouped",
            kind: "note",
            text: "未分組提醒",
            url: null,
            unresolved: false,
            group: null,
          },
          ...Array.from({ length: 42 }, (_, index) => ({
            id: `support:food:${index + 1}`,
            kind: "note" as const,
            text: `餐廳 ${index + 1}`,
            url: null,
            unresolved: false,
            group: {
              id: "sheet:food",
              label: "美食清單",
              order: 3,
            },
          })),
        ];
        render(
          <ResultDay
            activeDayId={trip.days[0]!.id}
            onOpenDay={() => undefined}
            presentation={createTripPresentation(trip)}
          />,
        );

        const summary = screen.getByRole("button", {
          name: "美食清單（42）",
        });
        expect(summary).toHaveAttribute("aria-expanded", "false");
        expect(
          screen.queryByRole("region", { name: "美食清單（42）" }),
        ).not.toBeInTheDocument();
        expect(
          screen.getByText("未分組提醒").compareDocumentPosition(summary) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();

        summary.focus();
        await userEvent.setup().keyboard("{Enter}");

        const region = screen.getByRole("region", {
          name: "美食清單（42）",
        });
        expect(summary).toHaveFocus();
        expect(summary).toHaveAttribute("aria-expanded", "true");
        expect(summary).toHaveAttribute("aria-controls", region.id);
        expect(region).toHaveAttribute("aria-labelledby", summary.id);
        expect(within(region).getByText("餐廳 1")).toBeVisible();
        expect(within(region).getByText("餐廳 42")).toBeVisible();
      } finally {
        Object.defineProperty(window, "innerWidth", {
          configurable: true,
          value: originalWidth,
        });
      }
    },
  );
});
