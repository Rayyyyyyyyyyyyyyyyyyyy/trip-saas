import { expect, test } from "@playwright/test";

test("production entry loads the spreadsheet adapter only on file selection under CSP", async ({
  page,
}) => {
  const errors: string[] = [];
  const adapters: string[] = [];
  let providerRequests = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    if (/\/assets\/spreadsheetSourceAdapter-[^/]+\.js/u.test(request.url()))
      adapters.push(request.url());
  });
  await page.route(
    "https://generativelanguage.googleapis.com/**",
    async (route) => {
      providerRequests += 1;
      await route.abort();
    },
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "把你已經有的行程，變成旅行當下能用的介面。",
    }),
  ).toBeVisible();
  expect(adapters).toHaveLength(0);
  await page
    .locator('input[type="file"][accept*=".csv"]')
    .setInputFiles({
      name: "csp-synthetic.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("2026-09-10\n自由散步\n"),
    });
  await expect(
    page.getByRole("region", { name: "已選擇行程檔案" }),
  ).toContainText("csp-synthetic.csv");
  await expect(
    page.getByRole("button", { name: /^(先讀取行程|送給 Gemini 判讀)$/u }),
  ).toBeEnabled();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "選擇要判讀的分頁" }),
  ).toHaveCount(0);
  expect(adapters).toHaveLength(1);
  expect(providerRequests).toBe(0);
  expect(errors).toEqual([]);
});
