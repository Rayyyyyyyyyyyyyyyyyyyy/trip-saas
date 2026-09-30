import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function openAtTokyoTime(page: Page, fixedNow: string) {
  await page.clock.setFixedTime(new Date(fixedNow));
  await page.goto("/");
  await page.getByRole("button", { name: "先看看大阪 2026 範例" }).click();
}

async function openMenuDestination(page: Page, name: string) {
  await page.getByRole("button", { name: "開啟選單" }).click();
  await page.getByRole("button", { name }).click();
}

test("shows pre-trip countdown and next flight", async ({ page }) => {
  await openAtTokyoTime(page, "2026-09-02T09:00:00+09:00");
  await openMenuDestination(page, "今天 / 現在");

  await expect(
    page.getByRole("heading", { name: "還有 8 天出發" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "JX822 · SEP 10" }),
  ).toBeVisible();
  await expect(page.getByText("TPE 10:15 → KIX 14:00")).toBeVisible();
  await expect(page.getByText("現在", { exact: true })).toHaveCount(0);
});

test("shows only source-supported NOW and NEXT on the Uji day", async ({
  page,
}) => {
  await openAtTokyoTime(page, "2026-09-12T15:00:00+09:00");

  await expect(page.getByText("現在", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "喫茶 コンソラ" }),
  ).toBeVisible();
  await expect(page.getByText("接下來", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "清次郎 北新地店" }),
  ).toBeVisible();
  await expect(page.getByText("17:50", { exact: true })).toBeVisible();
});

test("does not invent NOW on an unsupported day", async ({ page }) => {
  await openAtTokyoTime(page, "2026-09-13T15:00:00+09:00");

  await expect(
    page.getByText(
      "這一天沒有足夠精確的時間資料，因此不會猜測目前進行中的行程。",
    ),
  ).toBeVisible();
  await expect(page.getByText("現在", { exact: true })).toHaveCount(0);
});

test("keeps the full itinerary accessible after the trip", async ({ page }) => {
  await openAtTokyoTime(page, "2026-09-16T09:00:00+09:00");
  await openMenuDestination(page, "今天 / 現在");

  await expect(page.getByText("旅程已結束", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "09/12 SAT 宇治" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "宇治", exact: true }),
  ).toBeVisible();
});

test("keeps static itinerary access when Tokyo runtime fails", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeDateTimeFormat = Intl.DateTimeFormat;
    const FailingDateTimeFormat = function DateTimeFormat(
      locales?: Intl.LocalesArgument,
      options?: Intl.DateTimeFormatOptions,
    ) {
      if (options?.timeZone === "Asia/Tokyo") {
        throw new Error("simulated Tokyo runtime failure");
      }
      return new NativeDateTimeFormat(locales, options);
    } as Intl.DateTimeFormatConstructor;
    Object.defineProperty(Intl, "DateTimeFormat", {
      configurable: true,
      value: FailingDateTimeFormat,
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "先看看大阪 2026 範例" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "關西" }),
  ).toBeVisible();
  await openMenuDestination(page, "今天 / 現在");
  await expect(
    page.getByText("即時狀態暫時無法使用", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "靜態行程仍可使用" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "09/12 SAT 宇治" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "宇治", exact: true }),
  ).toBeVisible();
});

test("exposes the Golden date rail as a complete tablist and panel pair", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先看看大阪 2026 範例" }).click();
  await openMenuDestination(page, "今天 / 現在");
  await page.getByRole("tab", { name: "09/12 SAT 宇治" }).first().click();
  await expect(
    page.getByRole("heading", { level: 1, name: "宇治", exact: true }),
  ).toBeVisible();

  const tablist = page.getByRole("tablist", { name: "選擇行程日期" });
  await expect(tablist).toBeVisible();
  // The landmark survives the tab treatment; the rail is still navigation.
  await expect(
    page.getByRole("navigation", { name: "行程日期" }),
  ).toBeVisible();

  const tabs = tablist.getByRole("tab");
  await expect(tabs.first()).toBeVisible();

  const selectedTab = tablist.getByRole("tab", { selected: true });
  await expect(selectedTab).toHaveCount(1);

  // A tab must name the panel it controls, and that panel must point back at
  // the selected tab; otherwise the roles are decorative.
  const panelId = await selectedTab.getAttribute("aria-controls");
  expect(panelId).toBeTruthy();
  const panel = page.locator(`#${panelId}`);
  await expect(panel).toHaveAttribute("role", "tabpanel");
  await expect(panel).toHaveAttribute(
    "aria-labelledby",
    (await selectedTab.getAttribute("id")) ?? "",
  );

  // Roving tabindex: only the selected tab is in the sequential tab order.
  await expect(selectedTab).not.toHaveAttribute("tabindex", "-1");
  const unselected = tablist.getByRole("tab", { selected: false }).first();
  await expect(unselected).toHaveAttribute("tabindex", "-1");

  await tablist.getByRole("tab").nth(3).click();
  await expect(tablist.getByRole("tab", { selected: true })).toHaveCount(1);
  await expect(panel).toHaveAttribute(
    "aria-labelledby",
    (await tablist.getByRole("tab", { selected: true }).getAttribute("id")) ??
      "",
  );

  // Activating a tab must leave focus on the rail, or the roving tabindex is
  // stranded and arrow keys can no longer move between days.
  await expect(tablist.getByRole("tab", { selected: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(tablist.getByRole("tab", { selected: true })).toBeFocused();
  await expect(panel).toHaveAttribute(
    "aria-labelledby",
    (await tablist.getByRole("tab", { selected: true }).getAttribute("id")) ??
      "",
  );
});
