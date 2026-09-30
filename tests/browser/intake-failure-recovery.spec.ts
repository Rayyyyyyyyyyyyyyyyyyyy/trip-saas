import { expect, test, type Page } from "@playwright/test";

import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import { validInsufficientInterpretationResult } from "../fixtures/contracts/validContracts";
import { summaryShapedInterpretationResult } from "../fixtures/contracts/malformedContracts";

const longLocalizedFileName =
  "關西行程－大阪宇治奈良－包含一段需要完整換行顯示而不能被截斷的長檔名.md";

async function routeMalformedInterpretation(page: Page) {
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
      const interpretation = {
        ...summaryShapedInterpretationResult,
        source_schema_version: source.schema_version,
        source_id: source.source_id,
        coverage: {
          total_blocks: source.evidence_units.length,
          block_dispositions: source.evidence_units.map((unit) => ({
            source_ref: unit.id,
            disposition: "interpreted",
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

async function storeCredential(page: Page) {
  await page
    .getByRole("textbox", { name: "Gemini API key" })
    .fill("browser-test-key");
  await page.getByRole("button", { name: "儲存在這個瀏覽器" }).click();
  await expect(page.getByText(/API key 已加密保存在這個瀏覽器/)).toBeVisible();
}

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test("a 503 offers an explicit fallback without calling it automatically", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  let primaryRequests = 0;
  let fallbackRequests = 0;

  await page.route(
    "**/v1beta/models/gemini-test-model:generateContent",
    async (route) => {
      primaryRequests += 1;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: 503,
            message: "This model is currently experiencing high demand.",
            status: "UNAVAILABLE",
          },
        }),
      });
    },
  );
  await page.route(
    "**/v1beta/models/gemini-fallback-test-model:generateContent",
    async (route) => {
      fallbackRequests += 1;
      const request = route.request().postDataJSON() as {
        contents: Array<{ parts: Array<{ text: string }> }>;
      };
      const prompt = request.contents[0]!.parts[0]!.text;
      const source = JSON.parse(
        prompt.slice(prompt.indexOf('{"schema_version"')),
      ) as UnifiedSourceDocument;
      const firstSourceRef = source.evidence_units[0]!.id;
      const interpretation = structuredClone(
        validInsufficientInterpretationResult,
      );
      interpretation.source_schema_version = source.schema_version;
      interpretation.source_id = source.source_id;
      interpretation.findings.forEach((finding) => {
        finding.source_refs = [firstSourceRef];
      });
      interpretation.coverage = {
        total_blocks: source.evidence_units.length,
        block_dispositions: source.evidence_units.map((unit) => ({
          source_ref: unit.id,
          disposition: "unparsed" as const,
        })),
        unparsed_items: source.evidence_units.map((unit) => ({
          source_ref: unit.id,
          locator: unit.locator,
          reason_code: "missing_trip_structure",
          severity: "error" as const,
          message: "Trip structure is missing.",
        })),
      };
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

  await page.goto("/");
  await storeCredential(page);
  await page.getByRole("tab", { name: "直接貼上" }).click();
  await page
    .getByRole("textbox", { name: "貼上 Markdown 行程內容" })
    .fill("# Backup model check\n\n- Free time");
  await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();

  const notice = page.getByRole("alert");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("判讀服務目前無法處理請求");
  await expect(
    page.getByRole("button", {
      name: "改用 gemini-fallback-test-model 重試",
    }),
  ).toBeVisible();
  expect(primaryRequests).toBe(3);
  expect(fallbackRequests).toBe(0);

  await page
    .getByRole("button", {
      name: "改用 gemini-fallback-test-model 重試",
    })
    .click();

  await expect(
    page.getByRole("heading", { name: "目前還無法安全整理這份行程。" }),
  ).toBeVisible();
  expect(primaryRequests).toBe(3);
  expect(fallbackRequests).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  expect(consoleErrors).toEqual([
    "Failed to load resource: the server responded with a status of 503 (Service Unavailable)",
    "Failed to load resource: the server responded with a status of 503 (Service Unavailable)",
    "Failed to load resource: the server responded with a status of 503 (Service Unavailable)",
  ]);
});

test("a malformed interpretation exits the blocking dialog into a focused Home failure notice", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  await routeMalformedInterpretation(page);
  await page.goto("/");
  await storeCredential(page);

  await page.getByRole("tab", { name: "直接貼上" }).click();
  const pasted = "# Malformed run\n\n- 10:30 Arrive at Osaka";
  await page
    .getByRole("textbox", { name: "貼上 Markdown 行程內容" })
    .fill(pasted);
  await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();

  const processing = page.getByRole("dialog", {
    name: "貼上的 Markdown 行程",
  });
  await expect(processing).toBeVisible();
  await expect(processing).toHaveAttribute("aria-modal", "true");
  await expect(
    page.getByRole("button", { name: "送給 Gemini 判讀" }),
  ).toHaveCount(0);

  const notice = page.getByRole("alert");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("行程讀取失敗");
  await expect(notice).toContainText("目前的行程沒有變動");
  await expect(notice).toBeFocused();
  await expect(processing).toHaveCount(0);

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "把你已經有的行程，變成旅行當下能用的介面。",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "對照原文，把行程確認清楚。" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "貼上 Markdown 行程內容" }),
  ).toHaveValue(pasted);
  await expect(
    page.getByRole("button", { name: "重新送出這份行程" }),
  ).toBeVisible();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  expect(consoleErrors).toEqual([]);
});

test("a failed long localized filename stays readable and clears when the file is replaced", async ({
  page,
}) => {
  const consoleErrors = collectConsoleErrors(page);
  await routeMalformedInterpretation(page);
  await page.goto("/");
  await storeCredential(page);

  await page.locator('input[type="file"][accept*=".md"]').setInputFiles({
    name: longLocalizedFileName,
    mimeType: "text/markdown",
    buffer: Buffer.from("# 關西行程\n\n- 10:30 抵達大阪"),
  });
  await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();

  const notice = page.getByRole("alert");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("行程讀取失敗");
  await expect(
    page.getByRole("region", { name: "已選擇行程檔案" }),
  ).toContainText(longLocalizedFileName);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => {
      const alert = document.querySelector('[role="alert"]');
      if (!alert) throw new Error("Failure notice missing");
      return alert.scrollWidth > alert.clientWidth + 1;
    }),
  ).toBe(false);

  await page.getByRole("button", { name: "移除檔案" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
