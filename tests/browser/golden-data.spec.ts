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
  await expect(
    consolaCard.getByRole("link", { name: "開啟地圖" }),
  ).toHaveAttribute("href", consola.map!);
  await expect(
    consolaCard.getByRole("link", { name: "開啟地圖" }),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await expect(
    consolaCard.getByRole("link", { name: "開啟地圖" }),
  ).toHaveAttribute("target", "_blank");

  const seijiroCard = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: seijiro.title, exact: true }),
  });
  await expect(
    seijiroCard.getByRole("link", { name: "食べログ" }),
  ).toHaveAttribute("href", seijiro.tabelog!);
  await expect(page.getByRole("link", { name: ujiRiver.name })).toHaveAttribute(
    "href",
    ujiRiver.map,
  );
  await expect(page.getByRole("link", { name: ujiRiver.name })).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await expect(page.getByRole("link", { name: ujiRiver.name })).toHaveAttribute(
    "target",
    "_blank",
  );
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
