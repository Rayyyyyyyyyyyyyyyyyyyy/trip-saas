import { expect, test } from "@playwright/test";

import { goldenOsakaCanonicalTrip } from "../../src/fixtures/golden/osakaCanonicalTrip";
import { validCanonicalTrip } from "../fixtures/contracts/validContracts";

test("Golden-ID imports and reloads render the supplied trip while sample remains explicit", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.clock.setFixedTime(new Date("2026-09-07T12:00:00+09:00"));
  await page.goto("/");
  const supplied = {
    ...structuredClone(validCanonicalTrip),
    id: goldenOsakaCanonicalTrip.id,
    title: "My corrected Golden-ID trip",
  };
  await page.getByText("從 JSON 匯入完整行程").click();
  await page.locator('input[accept*="application/json"]').setInputFiles({
    name: "corrected-golden.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(supplied)),
  });
  await expect(
    page.getByRole("heading", { level: 1, name: supplied.title }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: supplied.title }),
  ).toBeVisible();
  await page.getByRole("button", { name: "首頁", exact: true }).click();
  await page.getByRole("button", { name: "先看看大阪 2026 範例" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "關西", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "開啟選單" }).click();
  await page.getByRole("button", { name: /首頁/ }).click();
  await page.getByRole("button", { name: "回到目前行程" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: supplied.title }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});
