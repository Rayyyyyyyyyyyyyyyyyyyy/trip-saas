import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { days } from "../../src/tripData";

async function openMenuDestination(page: Page, name: string) {
  await page.getByRole("button", { name: "開啟選單" }).click();
  await page.getByRole("button", { name }).click();
}

test("uses exact source-provided Maps and Tabelog URLs", async ({ page }) => {
  const ujiDay = days.find((day) => day.date === "2026-09-12");
  const consola = ujiDay!.events.find(
    (event) => event.title === "喫茶 コンソラ",
  )!;
  const seijiro = ujiDay!.events.find(
    (event) => event.title === "清次郎 北新地店",
  )!;
  const ujiRiver = ujiDay!.optional!.find((place) => place.name === "宇治川")!;

  await page.goto("/");
  await page.getByRole("button", { name: "先看看大阪 2026 範例" }).click();
  await page.getByRole("tab", { name: "09/12 SAT 宇治" }).click();

  const consolaCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: consola.title, exact: true }),
  });
  const consolaLink = consolaCard.getByRole("link", { name: "開啟地圖" });
  await expect(consolaLink).toHaveText("開啟地圖");
  await expect(consolaLink).toHaveAttribute("aria-label", "開啟地圖");
  await expect(consolaLink).toHaveAttribute("href", consola.map!);
  await expect(consolaLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(consolaLink).toHaveAttribute("target", "_blank");

  const seijiroCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: seijiro.title, exact: true }),
  });
  await expect(
    seijiroCard.getByRole("link", { name: "食べログ" }),
  ).toHaveAttribute("href", seijiro.tabelog!);
  await expect(
    seijiroCard.getByRole("link", { name: "食べログ" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await expect(
    seijiroCard.getByRole("link", { name: "食べログ" }),
  ).toHaveAttribute("target", "_blank");

  const ujiRiverCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: ujiRiver.name, exact: true }),
  });
  const ujiRiverLink = ujiRiverCard.getByRole("link", {
    name: ujiRiver.name,
  });
  await expect(ujiRiverLink).toHaveText(ujiRiver.name);
  await expect(ujiRiverLink).toHaveAttribute("aria-label", ujiRiver.name);
  await expect(ujiRiverLink).toHaveAttribute("href", ujiRiver.map);
  await expect(ujiRiverLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(ujiRiverLink).toHaveAttribute("target", "_blank");

  await page.getByRole("tab", { name: "09/10 THU 大阪" }).click();
  const ramenSearch = page.getByRole("link", {
    name: "以「野口太郎ラーメン 北新地本店」搜尋 Google 地圖",
  });
  await expect(ramenSearch).toHaveAttribute(
    "aria-label",
    "以「野口太郎ラーメン 北新地本店」搜尋 Google 地圖",
  );
  await expect(ramenSearch).toHaveAttribute(
    "href",
    "https://www.google.com/maps/search/?api=1&query=%E9%87%8E%E5%8F%A3%E5%A4%AA%E9%83%8E%E3%83%A9%E3%83%BC%E3%83%A1%E3%83%B3%20%E5%8C%97%E6%96%B0%E5%9C%B0%E6%9C%AC%E5%BA%97",
  );
  await expect(ramenSearch).toHaveText("搜尋 Google 地圖");
  await expect(ramenSearch).toHaveAttribute("rel", "noopener noreferrer");
  await expect(ramenSearch).toHaveAttribute("target", "_blank");
});

test("synchronizes checklist and reservation status with USJ pending by default", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "先看看大阪 2026 範例" }).click();
  await openMenuDestination(page, "預約與票券");

  const usjCheckbox = page.getByRole("checkbox", {
    name: "USJ 門票／事前票券",
  });
  await expect(usjCheckbox).not.toBeChecked();
  await expect(page.getByText("Action needed", { exact: true })).toBeVisible();

  await usjCheckbox.click();

  await expect(usjCheckbox).toBeChecked();
  await expect(page.getByText("Ticket ready", { exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "先看看大阪 2026 範例" }).click();
  await openMenuDestination(page, "預約與票券");
  await expect(
    page.getByRole("checkbox", { name: "USJ 門票／事前票券" }),
  ).toBeChecked();
  await expect(page.getByText("Ticket ready", { exact: true })).toBeVisible();
});
