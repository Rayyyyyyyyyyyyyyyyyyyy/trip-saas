import { expect, test } from "@playwright/test";

for (const stage of [
  "reading",
  "extracting",
  "validating_source",
  "loading_credential",
  "parsing",
  "validating_draft",
]) {
  test(`${stage} timeout releases modal with source and confirmed trip intact`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.clock.install();
    await page.goto(
      `/tests/browser/fixtures/trip-processing.html?stage=${stage}`,
    );
    await page.getByRole("button", { name: "測試首頁" }).click();
    await page.getByRole("tab", { name: "直接貼上" }).click();
    await page
      .getByRole("textbox", { name: "貼上 Markdown 行程內容" })
      .fill("# Preserved itinerary");
    await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "停止這次判讀" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.clock.fastForward(5_100);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("alert")).toContainText("超過等待時限");
    await expect(
      page.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
    ).toHaveValue("# Preserved itinerary");
    await expect(
      page.getByRole("button", { name: "重新送出這份行程" }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.getByRole("button", { name: "回到目前行程" }).click();
    await expect(page.getByRole("button", { name: "測試首頁" })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("explicit stop closes modal immediately and ignores late provider success", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/tests/browser/fixtures/trip-processing.html?stage=parsing");
  await page.getByRole("button", { name: "測試首頁" }).click();
  await page.locator('input[accept*=".md"]').setInputFiles({
    name: "preserved.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Keep this file"),
  });
  await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();
  await page.getByRole("button", { name: "停止這次判讀" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() =>
    (
      window as unknown as { finishProcessingTest(): void }
    ).finishProcessingTest(),
  );
  await expect(page.getByRole("alert")).toContainText("取消");
  await expect(
    page.getByRole("region", { name: "已選擇行程檔案" }),
  ).toContainText("preserved.md");
  await expect(
    page.getByRole("button", { name: "重新送出這份行程" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "對照原文，把行程確認清楚。" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

for (const stage of ["invalid_document", "provider_timeout"]) {
  test(`${stage} fails safely before Review and preserves retry and the confirmed trip`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(
      `/tests/browser/fixtures/trip-processing.html?stage=${stage}`,
    );
    await page.getByRole("button", { name: "測試首頁" }).click();
    await page.getByRole("tab", { name: "直接貼上" }).click();
    await page
      .getByRole("textbox", { name: "貼上 Markdown 行程內容" })
      .fill("# Source stays available");
    await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();
    await expect(page.getByRole("alert")).toContainText(
      stage === "invalid_document"
        ? "結構檢查沒有通過"
        : "送出判讀後太久沒有得到回應",
    );
    await expect(page.getByRole("alert")).not.toContainText(
      "raw transport diagnostic",
    );
    expect(
      await page.evaluate(() =>
        (
          window as unknown as { processingProviderCalls(): number }
        ).processingProviderCalls(),
      ),
    ).toBe(stage === "invalid_document" ? 0 : 1);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
    ).toHaveValue("# Source stays available");
    await expect(
      page.getByRole("button", { name: "重新送出這份行程" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("heading", { name: "對照原文，把行程確認清楚。" }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.getByRole("button", { name: "回到目前行程" }).click();
    await expect(page.getByRole("button", { name: "測試首頁" })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
