import { expect, test } from "@playwright/test";

async function correctEntityTime(
  page: import("@playwright/test").Page,
  title: string,
) {
  const article = page
    .locator("article")
    .filter({ has: page.locator(`input[value="${title}"]`) });
  await article.getByRole("combobox", { name: "時間精度" }).click();
  await page.getByRole("option", { name: "沒有時間" }).click();
}

test("captured medium output recovers through Review, persistence, reload and full Result", async ({
  page,
}, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/tests/browser/fixtures/captured-benchmark-review.html");
  await expect(page.getByRole("main", { name: "校對行程" })).toBeVisible();
  await page.getByRole("button", { name: "查看完整校對內容" }).click();
  const reviewStartedAt = Date.now();

  await page
    .locator('input[value="혼고집 명동직營店 (燒肉)"]')
    .fill("혼고집 명동직영점 (燒肉)");
  for (const title of [
    "혼고집 명동직영점 (燒肉)",
    "돈수백 홍대직영점 (豬肉湯飯)",
    "무한리필몽블리 명동2호점 (燒肉)",
  ]) {
    await correctEntityTime(page, title);
  }

  const resolve = page.getByRole("button", { name: /^確認已解決 / });
  const resolutionCount = await resolve.count();
  // The captured blockers are mechanically detectable unsupported clocks.
  // They now require candidate-changing corrections and expose no generic
  // acknowledgement action.
  expect(resolutionCount).toBe(0);
  while ((await resolve.count()) > 0) await resolve.first().click();

  const confirm = page.getByRole("button", { name: "確認並使用這份行程" });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page.getByRole("main", { name: "行程總覽" })).toBeVisible();
  const reviewCorrectionMs = Date.now() - reviewStartedAt;
  const lookupMs: Record<string, number> = {};
  const timeLookup = async (label: string, lookup: () => Promise<void>) => {
    const startedAt = Date.now();
    await lookup();
    lookupMs[label] = Date.now() - startedAt;
  };
  await timeLookup("undated", async () => {
    await expect(
      page.getByRole("heading", { name: "韓國 - 首爾" }),
    ).toBeVisible();
    await expect(page.getByText("日期未定 — 日期未定")).toBeVisible();
    await expect(page.getByText("未指定日期／旅程資訊")).toBeVisible();
    await expect(page.getByRole("heading", { name: "去程" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "回程" })).toBeVisible();
  });

  await timeLookup("action", async () => {
    await page.getByRole("button", { name: /第 1 天/ }).click();
    await expect(page.getByText("時刻表", { exact: true })).toHaveAttribute(
      "href",
      "https://www.airportrailroad.com/train/express/info",
    );
  });
  await page.getByRole("button", { name: "行程總覽" }).click();

  await timeLookup("raw_time", async () => {
    await page.getByRole("button", { name: /第 2 天/ }).click();
    await expect(page.getByText("혼고집 명동직영점 (燒肉)")).toBeVisible();
    await expect(page.getByText("12點", { exact: true })).toBeVisible();
    await expect(page.getByText("12:00", { exact: true })).toHaveCount(0);
  });
  await page.getByRole("button", { name: "行程總覽" }).click();
  await page.getByRole("button", { name: /第 3 天/ }).click();
  await expect(page.getByText("11點", { exact: true })).toBeVisible();
  await timeLookup("optional", async () => {
    await expect(page.getByText("還有體力的話", { exact: true })).toBeVisible();
    await page.getByText("還有體力的話", { exact: true }).click();
  });
  await timeLookup("alternative", async () => {
    await expect(page.getByText("去梨泰院", { exact: true })).toBeVisible();
    await expect(page.getByText("回房間躺", { exact: true })).toBeVisible();
  });

  await page.getByRole("button", { name: "行程總覽" }).click();
  await timeLookup("address", async () => {
    await page.getByRole("button", { name: /第 5 天/ }).click();
    await expect(
      page.getByText("首爾特別市瑞草區瑞草大路77街 3"),
    ).toBeVisible();
    await expect(page.getByText("七點", { exact: true })).toBeVisible();
  });

  const audit = JSON.parse(
    (await page.getByLabel("恢復驗收紀錄").textContent())!,
  ) as {
    corrected_fields: string[];
    critical_corrections: string[];
    explicit_finding_resolutions: number;
    remaining_unsupported_facts: string[];
  };
  expect(audit.corrected_fields).toHaveLength(4);
  expect(audit.critical_corrections).toHaveLength(4);
  expect(audit.explicit_finding_resolutions).toBe(resolutionCount);
  expect(audit.remaining_unsupported_facts).toEqual(
    expect.arrayContaining(["MISSING_YEAR", "AMBIGUOUS_CLOCK_FORMAT"]),
  );
  expect(consoleErrors).toEqual([]);
  console.log(
    `CAPTURED_ACCEPTANCE_METRICS ${JSON.stringify({
      project: testInfo.project.name,
      reviewCorrectionMs,
      correctedFields: audit.corrected_fields.length,
      findingResolutions: resolutionCount,
      lookupMs,
      sourceReopens: 0,
    })}`,
  );

  await page.evaluate(async () => {
    await (
      window as typeof window & {
        clearCapturedBenchmarkRecovery(): Promise<void>;
      }
    ).clearCapturedBenchmarkRecovery();
    sessionStorage.clear();
  });
});
