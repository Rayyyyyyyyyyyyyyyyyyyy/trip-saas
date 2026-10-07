import { expect, test } from "@playwright/test";

test("preserves a missing-year partial date through Review, confirmation and reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/tests/browser/fixtures/tabular-date-review.html");
  await expect(page.getByText("系統保守調整 3 項")).toBeVisible();
  await expect(page.getByText("沒有需要你決定的問題")).toBeVisible();
  await expect(
    page.getByText("已保留原文，未採用沒有來源支持的年份").first(),
  ).toBeVisible();
  const confirm = page.getByRole("button", { name: "確認並使用這份行程" });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(
    page.getByRole("heading", { name: "Synthetic spreadsheet" }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Synthetic spreadsheet" }).first(),
  ).toBeVisible();
  const saved = await page.evaluate(async () =>
    (
      window as unknown as { readTabularConfirmed: () => Promise<any> }
    ).readTabularConfirmed(),
  );
  expect(saved.status).toBe("ready");
  expect(saved.trip).toMatchObject({ start_date: null, end_date: null });
  expect(saved.trip.days[0]).toMatchObject({ date: null, label: "8/16" });
  expect(
    saved.trip.supporting_items.some(
      (item: { text: string }) => item.text === "8/16",
    ),
  ).toBe(true);
  for (const field of [
    "dateDecisions",
    "typed_hint",
    "extraction_findings",
    "adjustments",
  ])
    expect(JSON.stringify(saved.trip)).not.toContain(field);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
