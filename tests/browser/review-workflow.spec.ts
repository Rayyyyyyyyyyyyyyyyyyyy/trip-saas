import { expect, test, type Page } from "@playwright/test";

import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import { validParsedTripDraft } from "../fixtures/contracts/validContracts";

async function configureMockGemini(
  page: Page,
  options: {
    mode?: "clear" | "conflict" | "unsupported_clock";
    unknownDates?: boolean;
  } = {},
) {
  const mode = options.mode ?? "conflict";
  await page.route(
    "**/v1beta/models/gemini-test-model:generateContent",
    async (route) => {
      const request = route.request().postDataJSON() as {
        contents: Array<{ parts: Array<{ text: string }> }>;
      };
      const prompt = request.contents[0]!.parts[0]!.text;
      const source = JSON.parse(
        prompt.slice(prompt.indexOf('{"schema_version"')),
      ) as UnifiedSourceDocument;
      const firstSourceRef = source.evidence_units[0]!.id;
      const draft = structuredClone(validParsedTripDraft);
      draft.trip = {
        ...draft.trip,
        id: "trip:browser-review",
        title: "Browser Review Trip",
        source_refs: [firstSourceRef],
      };
      draft.days = draft.days.map((day) => ({
        ...day,
        source_refs: [firstSourceRef],
      }));
      draft.entities = draft.entities.map((entity) => ({
        ...entity,
        source_refs: [firstSourceRef],
      }));
      if (options.unknownDates) {
        draft.trip.start_date = null;
        draft.trip.end_date = null;
        draft.days.forEach((day) => {
          day.date = null;
        });
      }
      if (mode === "unsupported_clock") {
        draft.entities[0]!.time = {
          kind: "exact",
          start: "06:30",
          end: null,
          daypart: null,
          raw_text: "6:30",
          crosses_midnight: false,
        };
      }
      const interpretation = {
        schema_version: "semantic-interpretation-result.v1",
        source_schema_version: source.schema_version,
        source_id: source.source_id,
        status: "draft",
        draft,
        findings:
          mode === "conflict"
            ? [
                {
                  id: "finding:browser-review-ambiguity",
                  blocking: true,
                  code: "AMBIGUOUS_BOOKING_REFERENCE",
                  message: "Confirm which booking reference applies.",
                  severity: "review",
                  entity_refs: [draft.entities[0]!.id],
                  source_refs: [firstSourceRef],
                },
              ]
            : [],
        coverage: {
          total_blocks: source.evidence_units.length,
          block_dispositions: source.evidence_units.map((unit, index) => ({
            source_ref: unit.id,
            disposition: index === 0 ? "interpreted" : "supporting",
          })),
          unparsed_items: [],
        },
      };
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          candidates: [
            { content: { parts: [{ text: JSON.stringify(interpretation) }] } },
          ],
        }),
      });
    },
  );
}

async function openReview(
  page: Page,
  markdown = "# Browser Review Trip\n\n- 10:30 Arrive at Osaka",
) {
  await page.getByRole("tab", { name: "直接貼上" }).click();
  await page
    .getByRole("textbox", { name: "貼上 Markdown 行程內容" })
    .fill(markdown);
  await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();
  const processing = page.getByRole("dialog", {
    name: "貼上的 Markdown 行程",
  });
  await expect(processing).toBeVisible();
  await expect(processing.getByRole("status")).toHaveText(
    "Gemini 正在判讀內容",
  );
  await expect(
    page.getByRole("button", { name: "送給 Gemini 判讀" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "對照原文，把行程確認清楚。" }),
  ).toBeVisible();
}

test("Review retains booking evidence past 4000 characters without page overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await configureMockGemini(page);
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Gemini API key" })
    .fill("browser-test-key");
  await page.getByRole("button", { name: "儲存在這個瀏覽器" }).click();
  await expect(page.getByText(/API key 已加密保存在這個瀏覽器/)).toBeVisible();
  const table =
    "| 時間 | 行程 |\n| --- | --- |\n" +
    "| 彈性 | 自由散步，不需預約 |\n".repeat(240) +
    "| 16:00 | 最晚抵達餐廳，16:30 訂位 ABC123 |";
  await openReview(page, table);
  await page.getByRole("button", { name: "查看完整校對內容" }).click();
  // The trip-level evidence and the entity-level evidence both retain the tail.
  const tail = page
    .locator("blockquote")
    .filter({ hasText: "最晚抵達餐廳，16:30 訂位 ABC123" });
  await expect(tail.first()).toBeVisible();
  await tail.first().scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

async function durableStorageText(page: Page) {
  return page.evaluate(async () => {
    const snapshot: Record<string, unknown> = {
      localStorage: { ...localStorage },
    };
    for (const databaseInfo of await indexedDB.databases()) {
      if (!databaseInfo.name) continue;
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseInfo.name!);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const records: Record<string, unknown[]> = {};
      for (const storeName of database.objectStoreNames) {
        const transaction = database.transaction(storeName, "readonly");
        records[storeName] = await new Promise<unknown[]>((resolve, reject) => {
          const request = transaction.objectStore(storeName).getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
      database.close();
      snapshot[databaseInfo.name] = records;
    }
    return JSON.stringify(snapshot);
  });
}

function expectSensitiveSessionStateAbsent(snapshot: string) {
  for (const forbidden of [
    "browser-test-key",
    "# Browser Review Trip",
    "10:30 Arrive at Osaka",
    "semantic-interpretation-result.v1",
    "source-block:",
  ]) {
    expect(snapshot).not.toContain(forbidden);
  }
}

test("Review keeps mobile/desktop correction parity and commits only after confirmation", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await configureMockGemini(page);
  await page.goto("/");

  const home = page.getByRole("main", { name: "Trip Runtime 首頁" });
  await expect(home).toBeVisible();
  const uploadTab = page.getByRole("tab", { name: "上傳檔案" });
  await uploadTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "直接貼上" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(uploadTab).toBeFocused();

  const uploadSurface = page.getByRole("button", {
    name: /行程檔案/,
  });
  expect(
    await uploadSurface.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
      };
    }),
  ).toEqual({ borderRadius: "0px", boxShadow: "none" });

  await page.locator('input[type="file"][accept*=".md"]').setInputFiles({
    name: "browser-selected-trip.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Browser selected trip"),
  });
  const selectedFile = page.getByRole("region", {
    name: "已選擇行程檔案",
  });
  await expect(selectedFile).toContainText("browser-selected-trip.md");
  await expect(page.getByRole("button", { name: "更換檔案" })).toBeVisible();
  await page.getByRole("button", { name: "移除檔案" }).click();
  await expect(selectedFile).toHaveCount(0);
  await expect(uploadSurface).toBeVisible();

  await page.getByRole("button", { name: /支援格式與資料安全/ }).click();
  await expect(page.getByText(/Excel／CSV 要等 Markdown/)).toBeVisible();
  await expect(page.getByText(/PDF 目前不支援匯入/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);

  await page
    .getByRole("textbox", { name: "Gemini API key" })
    .fill("browser-test-key");
  await page.getByRole("button", { name: "儲存在這個瀏覽器" }).click();
  await expect(page.getByText(/API key 已加密保存在這個瀏覽器/)).toBeVisible();

  await openReview(page);
  await expect(
    page.getByRole("button", { name: "確認並使用這份行程" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "標題", exact: true }),
  ).toHaveCount(0);
  const disclosure = page.getByRole("button", {
    name: "查看完整校對內容",
  });
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "收起完整校對內容" }),
  ).toHaveAttribute("aria-expanded", "true");
  const title = page.getByRole("textbox", { name: "標題", exact: true });
  await title.fill("Corrected arrival");
  await expect(page.getByText("原始：Arrive")).toBeVisible();
  await page.getByRole("checkbox", { name: "可選行程" }).check();
  await page.getByRole("checkbox", { name: "暫定" }).check();
  await page.getByRole("checkbox", { name: "時間有彈性" }).check();
  await expect(page.getByText(/已保留你的修改/)).toBeVisible();
  await expect(page.getByText("你的校正")).toBeVisible();
  await expect(page.getByText("# Browser Review Trip").first()).toBeVisible();

  const reviewVisuals = await page.evaluate(() => {
    const measure = document.querySelector('main[aria-label="校對行程"] > div');
    const article = document.querySelector(
      'main[aria-label="校對行程"] article',
    );
    const excerpt = document.querySelector("blockquote");
    if (!measure || !article || !excerpt)
      throw new Error("Review surface missing");
    const articleStyle = getComputedStyle(article);
    return {
      articleBorderRadius: articleStyle.borderRadius,
      articleBoxShadow: articleStyle.boxShadow,
      excerptFontFamily: getComputedStyle(excerpt).fontFamily,
      measureWidth: measure.getBoundingClientRect().width,
    };
  });
  expect(reviewVisuals.articleBorderRadius).toBe("0px");
  expect(reviewVisuals.articleBoxShadow).toBe("none");
  expect(reviewVisuals.excerptFontFamily).toMatch(/monospace|Menlo|Monaco/i);
  expect(reviewVisuals.measureWidth).toBeLessThanOrEqual(680);

  const integrity = await page.evaluate(() => ({
    hasHorizontalOverflow:
      document.documentElement.scrollWidth > window.innerWidth,
    undersizedControls: [...document.querySelectorAll("button, a[href]")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width < 44 || rect.height < 44).length,
  }));
  expect(integrity).toEqual({
    hasHorizontalOverflow: false,
    undersizedControls: 0,
  });

  await page.getByRole("button", { name: "取消匯入，保留目前行程" }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "把你已經有的行程，變成旅行當下能用的介面。",
    }),
  ).toBeVisible();
  expectSensitiveSessionStateAbsent(await durableStorageText(page));
  await page.reload();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "把你已經有的行程，變成旅行當下能用的介面。",
    }),
  ).toBeVisible();
  expectSensitiveSessionStateAbsent(await durableStorageText(page));

  await openReview(page);
  await page.getByRole("button", { name: "查看完整校對內容" }).click();
  await page.getByLabel("行程名稱").fill("Browser Confirmed Trip");
  await page
    .getByRole("button", {
      name: "確認已解決 AMBIGUOUS_BOOKING_REFERENCE",
    })
    .click();
  await expect(page.getByText("USER_RESOLVED_FINDING")).toBeVisible();
  await page.getByRole("button", { name: "確認並使用這份行程" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Browser Confirmed Trip" }),
  ).toBeVisible();
  const confirmation = page.getByRole("region", {
    name: /「Browser Confirmed Trip」已經可以使用/,
  });
  expect(
    await confirmation.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
      };
    }),
  ).toEqual({ borderRadius: "0px", boxShadow: "none" });
  expectSensitiveSessionStateAbsent(await durableStorageText(page));
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Browser Confirmed Trip" }),
  ).toBeVisible();
  expectSensitiveSessionStateAbsent(await durableStorageText(page));
  expect(consoleErrors).toEqual([]);
});

test("Review keeps missing-year dates empty and supports correcting then clearing them", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await configureMockGemini(page, { unknownDates: true });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Gemini API key" })
    .fill("browser-test-key");
  await page.getByRole("button", { name: "儲存在這個瀏覽器" }).click();
  await expect(page.getByText(/API key 已加密保存在這個瀏覽器/)).toBeVisible();
  await openReview(page, "# Trip without year\n\n6/25 arrive");
  await page.getByRole("button", { name: "查看完整校對內容" }).click();
  const date = page
    .locator('section[aria-labelledby="review-days"] input[type="date"]')
    .first();
  await expect(date).toHaveValue("");
  await date.fill("2027-06-25");
  await expect(date).toHaveValue("2027-06-25");
  await date.fill("");
  await expect(date).toHaveValue("");
  await expect(page.getByText("SCHEMA_INVALID", { exact: true })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("Review conservatively downgrades unsupported clock precision and persists no session recovery payload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await configureMockGemini(page, { mode: "unsupported_clock" });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Gemini API key" })
    .fill("browser-test-key");
  await page.getByRole("button", { name: "儲存在這個瀏覽器" }).click();
  await openReview(page, "# Browser Review Trip\n\n- 6:30 Arrive at Osaka");

  await expect(page.getByText("系統保守調整 1 項")).toBeVisible();
  await expect(page.getByText(/現在：時間未定，保留「6:30」/)).toBeVisible();
  await expect(page.getByText("沒有需要你決定的問題")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "確認並使用這份行程" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", {
      name: "確認已解決 AMBIGUOUS_CLOCK_PRECISION_INFERRED",
    }),
  ).toHaveCount(0);

  const disclosure = page.getByRole("button", {
    name: "查看完整校對內容",
  });
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "收起完整校對內容" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("combobox", { name: "時間精度" })).toHaveText(
    "沒有時間",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);

  await page.getByRole("button", { name: "確認並使用這份行程" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Browser Review Trip" }),
  ).toBeVisible();
  const storage = await durableStorageText(page);
  expect(storage).not.toContain("adjustment:unsupported-clock");
  expect(storage).not.toContain("AMBIGUOUS_CLOCK_PRECISION_INFERRED");
  expect(storage).not.toContain("semantic-interpretation-result.v1");
  expect(storage).not.toContain('"start":"06:30"');
  expect(errors).toEqual([]);
});

test("Review confirms a zero-blocker candidate without requiring full-document inspection", async ({
  page,
}) => {
  await configureMockGemini(page, { mode: "clear" });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Gemini API key" })
    .fill("browser-test-key");
  await page.getByRole("button", { name: "儲存在這個瀏覽器" }).click();
  await openReview(page);

  await expect(page.getByText("系統保守調整 0 項")).toBeVisible();
  await expect(page.getByText("沒有需要你決定的問題")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "標題", exact: true }),
  ).toHaveCount(0);
  const confirm = page.getByRole("button", {
    name: "確認並使用這份行程",
  });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Browser Review Trip" }),
  ).toBeVisible();
});
