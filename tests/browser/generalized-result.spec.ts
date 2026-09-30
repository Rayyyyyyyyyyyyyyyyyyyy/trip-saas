import { expect, test } from "@playwright/test";

import { validCanonicalTrip } from "../fixtures/contracts/validContracts";

function browserTrip() {
  const trip = structuredClone(validCanonicalTrip);
  trip.id = "trip:browser-result";
  trip.title = "Browser Result Trip";
  trip.end_date = "2026-09-19";
  trip.days.push({
    id: "day:2026-09-11",
    date: "2026-09-11",
    source_order: 1,
    label: "Flexible day",
    title: "Flexible day",
    subtitle: "No invented anchor",
    leave_by: null,
  });
  trip.entities[0].actions = [
    {
      id: "action:browser-map",
      kind: "map",
      label: "Open exact map",
      url: "https://example.com/exact-browser-map",
    },
  ];
  trip.entities[0].time = {
    kind: "exact",
    start: "10:30",
    end: null,
    daypart: null,
    raw_text: "10:30",
    crosses_midnight: false,
  };
  trip.entities[0].readiness = {
    kind: "document",
    status: "action_needed",
    detail: "Bring the confirmation",
    todo_id: null,
  };
  trip.entities[0].reservation = {
    status: "confirmed",
    reference: "BOOKING-001",
    detail: "Window seat",
    todo_id: null,
  };
  trip.entities[0].semantic_type = "transit";
  trip.entities.push({
    ...structuredClone(trip.entities[0]),
    id: "entity:ordinary-transit",
    title: "Ordinary rail connector",
    actions: [],
    readiness: null,
    time: {
      kind: "none",
      start: null,
      end: null,
      daypart: null,
      raw_text: null,
      crosses_midnight: false,
    },
  });
  trip.entities.push({
    ...structuredClone(trip.entities[0]),
    id: "entity:browser-optional",
    day_id: "day:2026-09-11",
    title: "Optional free time",
    semantic_type: "free_time",
    actions: [],
    state: {
      optional: true,
      tentative: false,
      flexible: true,
      unresolved: false,
    },
  });
  for (let dayNumber = 12; dayNumber <= 19; dayNumber += 1) {
    const sequence = dayNumber - 10;
    trip.days.push({
      id: `day:2026-09-${dayNumber}`,
      date: `2026-09-${dayNumber}`,
      source_order: sequence,
      label: `Day ${sequence + 1}`,
      title: `Long trip day ${sequence + 1}`,
      subtitle: null,
      leave_by: null,
    });
  }
  return trip;
}

async function importBrowserTrip(page: import("@playwright/test").Page) {
  await page.getByText("從 JSON 匯入完整行程").click();
  await page.locator('input[accept*="application/json"]').setInputFiles({
    name: "browser-result.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(browserTrip())),
  });
}

function partialDateTrip() {
  const trip = structuredClone(validCanonicalTrip);
  trip.id = "trip:partial-date-result";
  trip.title = "Seoul Result Trip";
  trip.start_date = null;
  trip.end_date = null;
  trip.days = [25, 26, 27, 28, 29].map((day, index) => ({
    id: `day:seoul:${day}`,
    date: null,
    source_order: index,
    label: `第${["一", "二", "三", "四", "五"][index]}天 (6/${day})`,
    title: `第${["一", "二", "三", "四", "五"][index]}天 (6/${day})`,
    subtitle: null,
    leave_by: null,
  }));
  trip.entities[0].day_id = trip.days[0].id;
  trip.supporting_items = [
    {
      id: "support:seoul-image",
      kind: "asset",
      text: "![image.png](image%201.png)",
      url: null,
      unresolved: true,
    },
  ];
  return trip;
}

test("partial-date Result keeps navigation and missing-image fallback readable", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("從 JSON 匯入完整行程").click();
  await page.locator('input[accept*="application/json"]').setInputFiles({
    name: "partial-date-result.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(partialDateTrip())),
  });

  await expect(page.getByText("6/25 — 6/29")).toBeVisible();
  await expect(page.getByText("日期未定", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /第 1 天 · 6\/25/ }).click();

  for (const width of [375, 680, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    const overlaps = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const controls = buttons.filter((button) =>
        ["行程總覽", "首頁"].includes((button.textContent ?? "").trim()),
      );
      const dayButtons = buttons.filter((button) =>
        (button.textContent ?? "").includes("6/"),
      );
      const intersects = (left: DOMRect, right: DOMRect) =>
        left.left < right.right &&
        left.right > right.left &&
        left.top < right.bottom &&
        left.bottom > right.top;
      return controls.flatMap((control) =>
        dayButtons
          .filter((day) =>
            intersects(
              control.getBoundingClientRect(),
              day.getBoundingClientRect(),
            ),
          )
          .map(
            (day) =>
              `${control.textContent?.trim()} × ${day.textContent?.trim()}`,
          ),
      );
    });
    expect(overlaps, `${width}px navigation overlap`).toEqual([]);
  }

  await expect(page.getByText("圖片附件未提供")).toBeVisible();
  await expect(page.getByText("image 1.png")).toBeVisible();
  await expect(page.getByText("![image.png](image%201.png)")).toHaveCount(0);
});

test("Canonical import opens a responsive source-agnostic Overview and Day", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await importBrowserTrip(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "Browser Result Trip" }),
  ).toBeVisible();
  await expect(page.getByText("Today", { exact: true })).toHaveCount(0);
  await expect(page.getByText("航班", { exact: true })).toHaveCount(0);
  await expect(page.getByText("住宿", { exact: true })).toHaveCount(0);

  const overviewMeasure = await page
    .getByRole("main", { name: "行程總覽" })
    .evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      width: element.getBoundingClientRect().width,
    }));
  expect(overviewMeasure.width).toBeLessThanOrEqual(681);
  expect(overviewMeasure.background).toBe("rgb(255, 255, 255)");

  const dayIndex = page.getByRole("heading", { name: "每一天" });
  const dayIndexHandle = await dayIndex.elementHandle();
  expect(dayIndexHandle).not.toBeNull();
  for (const label of ["出發前要處理", "不能錯過的時間"]) {
    const appearsBeforeDayIndex = await page
      .getByText(label)
      .evaluate(
        (element, target) =>
          Boolean(
            element.compareDocumentPosition(target) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ),
        dayIndexHandle,
      );
    expect(appearsBeforeDayIndex).toBe(true);
  }

  await page.getByRole("button", { name: /第 10 天/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Long trip day 10" }),
  ).toBeFocused();
  const selectedDateGeometry = await page
    .locator('[aria-current="date"]')
    .evaluate((selected) => {
      const rail = selected.closest('nav[aria-label="行程日期"]');
      if (!rail) return null;
      const selectedRect = selected.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      return {
        rail: {
          left: railRect.left,
          right: railRect.right,
        },
        selected: {
          bottom: selectedRect.bottom,
          left: selectedRect.left,
          right: selectedRect.right,
          top: selectedRect.top,
        },
        viewportHeight: window.innerHeight,
      };
    });
  expect(selectedDateGeometry).not.toBeNull();
  expect(selectedDateGeometry!.selected.left).toBeGreaterThanOrEqual(
    selectedDateGeometry!.rail.left,
  );
  expect(selectedDateGeometry!.selected.right).toBeLessThanOrEqual(
    selectedDateGeometry!.rail.right + 1,
  );
  expect(selectedDateGeometry!.selected.top).toBeGreaterThanOrEqual(0);
  expect(selectedDateGeometry!.selected.bottom).toBeLessThanOrEqual(
    selectedDateGeometry!.viewportHeight,
  );

  await page.getByRole("button", { name: "行程總覽" }).click();

  const firstDay = page.getByRole("button", { name: /第 1 天 ·/ });
  await firstDay.focus();
  await firstDay.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "Arrival" }),
  ).toBeFocused();

  await expect(
    page.getByRole("heading", { name: "Ordinary rail connector" }),
  ).toHaveCount(1);
  const bookedTransport = page.locator(
    `[data-entity-id="${browserTrip().entities[0].id}"]`,
  );
  await expect(bookedTransport).toHaveCount(1);
  await expect(bookedTransport).toContainText("Bring the confirmation");
  const reservationLookupStartedAt = Date.now();
  await expect(bookedTransport).toContainText(
    "預約 · 已確認 · BOOKING-001 · Window seat",
  );
  console.log(
    `RESERVATION_LOOKUP_METRICS ${JSON.stringify({
      project: testInfo.project.name,
      reservationMs: Date.now() - reservationLookupStartedAt,
      sourceReopens: 0,
    })}`,
  );
  const exactLink = page.getByRole("link", { name: "開啟地圖" });
  await expect(exactLink).toHaveAttribute(
    "href",
    "https://example.com/exact-browser-map",
  );
  await expect(exactLink).toHaveAttribute("target", "_blank");
  await expect(exactLink).toHaveAttribute("rel", "noopener noreferrer");

  const secondDay = page.getByRole("button", { name: /09\/11/ });
  await secondDay.focus();
  await secondDay.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "Flexible day" }),
  ).toBeFocused();
  await expect(page.getByText("今天唯一不能動的")).toHaveCount(0);
  await page.getByText("還有體力的話").click();
  await expect(page.getByText("Optional free time")).toBeVisible();

  const integrity = await page.evaluate(() => ({
    hasHorizontalOverflow:
      document.documentElement.scrollWidth > window.innerWidth,
    selectedDateVisible: (() => {
      const selected = document.querySelector('[aria-current="date"]');
      if (!selected) return false;
      const rect = selected.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth;
    })(),
    undersizedTargets: [...document.querySelectorAll("button, a[href]")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width < 44 || rect.height < 44).length,
  }));

  expect(integrity).toEqual({
    hasHorizontalOverflow: false,
    selectedDateVisible: true,
    undersizedTargets: 0,
  });
  expect(consoleErrors).toEqual([]);
});

test("system dark mode keeps the frozen light-paper palette readable", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await importBrowserTrip(page);

  const result = page.getByRole("main", { name: "行程總覽" });
  await expect(result).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(result).toHaveCSS("color", "rgb(18, 18, 18)");

  const colors = await result.evaluate((element) => {
    const style = getComputedStyle(element);
    const rgb = (value: string) =>
      value
        .match(/\d+(?:\.\d+)?/g)
        ?.slice(0, 3)
        .map(Number) ?? [];
    const luminance = (value: string) => {
      const channels = rgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return (
        0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
      );
    };
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return {
      background: style.backgroundColor,
      color: style.color,
      contrast:
        (Math.max(foreground, background) + 0.05) /
        (Math.min(foreground, background) + 0.05),
    };
  });

  expect(colors.contrast).toBeGreaterThanOrEqual(4.5);
});

test("nested Day relationships preserve one full member, optional separation and source actions", async ({
  page,
}) => {
  const { relationshipStateCanonicalTrip } =
    await import("../fixtures/semantics/relationshipStateSemantics");
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByText("從 JSON 匯入完整行程").click();
  await page.locator('input[accept*="application/json"]').setInputFiles({
    name: "relationships.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(relationshipStateCanonicalTrip)),
  });
  await page.getByRole("button", { name: /第 1 天/ }).click();
  await expect(
    page.getByRole("heading", { name: "Free morning" }),
  ).toBeVisible();
  await page.getByText("還有體力的話").click();
  for (const entity of relationshipStateCanonicalTrip.entities) {
    await expect(page.locator(`[data-entity-id="${entity.id}"]`)).toHaveCount(
      1,
    );
  }
  expect(
    await page
      .getByRole("region", { name: "主要行程時間線" })
      .getByRole("heading", { level: 3 })
      .allTextContents(),
  ).toEqual([
    "Unresolved dinner place",
    "Document check",
    "Free morning",
    "Free evening",
  ]);
  const member = page.locator('[data-entity-id="semantic:entity:plan-a"]');
  for (const text of [
    "23:30–翌日 01:00",
    "暫定",
    "彈性",
    "待確認",
    "確認座位",
    "電子票已備妥",
    "攜帶訂位證明",
    "保留關係成員的原始指示",
  ]) {
    await expect(member).toContainText(text);
  }
  await expect(member.getByRole("link")).toHaveAttribute(
    "href",
    "https://example.com/member-map?exact=1",
  );
  await expect(member.getByRole("link")).toHaveAttribute("target", "_blank");
  await expect(member.getByRole("link")).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await expect(
    page
      .getByRole("region", { name: "主要行程時間線" })
      .getByRole("heading", { name: "Plan A" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("unknown dates, ambiguous time and null-Day information remain complete without invented precision", async ({
  page,
}) => {
  const trip = structuredClone(validCanonicalTrip);
  trip.title = null;
  trip.start_date = null;
  trip.end_date = null;
  trip.timezone = null;
  trip.days[0].date = null;
  trip.entities[0].title = "Ambiguous meeting";
  trip.entities[0].time = {
    kind: "none",
    start: null,
    end: null,
    daypart: null,
    raw_text: "8點",
    crosses_midnight: false,
  };
  trip.entities.push({
    ...structuredClone(trip.entities[0]),
    id: "entity:untimed",
    title: "Intentionally untimed walk",
    time: { ...trip.entities[0].time, raw_text: null },
  });
  trip.entities.push({
    ...structuredClone(trip.entities[0]),
    id: "entity:undated-medical",
    day_id: null,
    title: "Undated medical visit",
    place: {
      name: null,
      address: "SOURCE_ADDRESS_MARKER",
      url: null,
      unresolved: true,
    },
    time: { ...trip.entities[0].time, raw_text: "七點" },
    notes: ["Gangnam Station exit guidance"],
    reservation: {
      status: "pending",
      reference: null,
      detail: "Source reservation note",
      todo_id: null,
    },
    actions: [
      {
        id: "action:undated-browser-map",
        kind: "map",
        label: "Source map",
        url: "https://example.com/exact-undated-map",
      },
    ],
  });
  trip.entities.push({
    ...structuredClone(trip.entities[0]),
    id: "entity:undated-option",
    day_id: null,
    title: "Undated optional stop",
    state: { ...trip.entities[0].state, optional: true },
  });
  trip.relationships = [
    {
      id: "relationship:cross-region-alternative",
      type: "alternative",
      member_entity_ids: [trip.entities[0].id, "entity:undated-medical"],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: null,
    },
    {
      id: "relationship:cross-region-sequence",
      type: "sequence",
      member_entity_ids: [trip.entities[0].id, "entity:undated-medical"],
      parent_entity_id: null,
      child_entity_ids: [],
      condition: null,
    },
  ];
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByText("從 JSON 匯入完整行程").click();
  await page.locator('input[accept*="application/json"]').setInputFiles({
    name: "original-time.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(trip)),
  });
  await expect(
    page.getByRole("heading", { level: 1, name: "未命名行程" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "未指定日期／旅程資訊" }),
  ).toBeVisible();
  const undated = page.locator('[data-entity-id="entity:undated-medical"]');
  await expect(undated).toContainText("七點");
  await expect(undated).toContainText("SOURCE_ADDRESS_MARKER");
  await expect(undated).toContainText("Gangnam Station exit guidance");
  await expect(undated).toContainText("Source reservation note");
  await expect(undated).not.toContainText("19:00");
  await expect(page.getByText(/其他日期成員：Ambiguous meeting/)).toBeVisible();
  await expect(
    page.getByText("行程順序：Ambiguous meeting → Undated medical visit", {
      exact: true,
    }),
  ).toBeVisible();
  const undatedLink = undated.getByRole("link", { name: "開啟地圖" });
  await undatedLink.focus();
  await expect(undatedLink).toBeFocused();
  await expect(undatedLink).toHaveAttribute(
    "href",
    "https://example.com/exact-undated-map",
  );
  await page.getByText("未指定日期的可選項目").click();
  await expect(
    page.locator('[data-entity-id="entity:undated-option"]'),
  ).toBeVisible();
  await page.getByRole("button", { name: /第 1 天 · 日期未定/ }).click();
  await expect(
    page.getByText("行程順序：Ambiguous meeting → Undated medical visit", {
      exact: true,
    }),
  ).toBeVisible();
  const meeting = page.locator(`[data-entity-id="${trip.entities[0].id}"]`);
  await expect(meeting.getByText("8點", { exact: true })).toBeVisible();
  await expect(meeting).not.toContainText("08:00");
  await expect(meeting).not.toContainText("20:00");
  await expect(
    page.getByRole("region", { name: /今天.*不能錯過/ }),
  ).toHaveCount(0);
  const untimed = page.locator('[data-entity-id="entity:untimed"]');
  await expect(
    untimed.getByRole("heading", { name: "Intentionally untimed walk" }),
  ).toBeVisible();
  await expect(untimed).not.toContainText("8點");
  await expect(untimed).not.toContainText("時間未定");
  expect(
    await page.evaluate(() => ({
      hasHorizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth,
      duplicatePrimaryIds: [...document.querySelectorAll("[data-entity-id]")]
        .map((element) => element.getAttribute("data-entity-id"))
        .filter((id, index, ids) => id && ids.indexOf(id) !== index),
    })),
  ).toEqual({ hasHorizontalOverflow: false, duplicatePrimaryIds: [] });
  expect(errors).toEqual([]);
});
