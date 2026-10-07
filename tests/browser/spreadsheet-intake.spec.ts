import { expect, test, type Page } from "@playwright/test";
import * as XLSX from "xlsx";
import type { UnifiedSourceDocument } from "../../src/domain/source/types";
import {
  validCanonicalTrip,
  validParsedTripDraft,
} from "../fixtures/contracts/validContracts";

function syntheticWorkbook() {
  const workbook = XLSX.utils.book_new();
  const itinerary = XLSX.utils.aoa_to_sheet([
    [
      "2026-09-10",
      "",
      "",
      "表格寬度欄 D",
      "",
      "",
      "表格寬度欄 G",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "表格寬度欄 Z",
    ],
    ["", "自由散步"],
    [],
    ["", "", "", "交通備註"],
  ]);
  XLSX.utils.book_append_sheet(workbook, itinerary, "行程");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["地鐵備註"]]),
    "參考資料",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["EXCLUDED_EXPENSE_SECRET"]]),
    "金額",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["HIDDEN_WORKBOOK_SECRET"]]),
    "隱藏",
  );
  workbook.Workbook = {
    Sheets: [{ Hidden: 0 }, { Hidden: 0 }, { Hidden: 0 }, { Hidden: 1 }],
  };
  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  );
}

async function mockInterpreter(page: Page, failFirst = false) {
  const sources: UnifiedSourceDocument[] = [];
  await page.route("**/generativelanguage.googleapis.com/**", async (route) => {
    expect(route.request().url()).toContain(
      "models/gemini-test-model:generateContent",
    );
    const prompt = route.request().postDataJSON().contents[0].parts[0]
      .text as string;
    const source = JSON.parse(
      prompt.slice(prompt.indexOf('{"schema_version"')),
    ) as UnifiedSourceDocument;
    sources.push(source);
    const date = source.evidence_units.find(
      (unit) => unit.display_value === "2026-09-10",
    )!;
    const activity = source.evidence_units.find(
      (unit) => unit.display_value === "自由散步",
    )!;
    const wideRefs = source.evidence_units
      .filter((unit) => unit.display_value.startsWith("表格寬度欄"))
      .map((unit) => unit.id);
    const note = source.evidence_units.find(
      (unit) => unit.display_value === "地鐵備註",
    );
    const draft = structuredClone(validParsedTripDraft);
    draft.trip = {
      ...draft.trip,
      id: "trip:synthetic-sheet",
      title: "合成試算表行程",
      source_refs: [date.id, activity.id, ...wideRefs],
    };
    draft.days[0] = {
      ...draft.days[0]!,
      title: "散步日",
      source_refs: [date.id, activity.id],
    };
    draft.entities[0] = {
      ...draft.entities[0]!,
      title: "自由散步",
      raw_label: "自由散步",
      source_refs: [activity.id],
    };
    draft.supporting_items = note
      ? [
          {
            id: "supporting:subway",
            kind: "note",
            text: note.display_value,
            url: null,
            unresolved: false,
            source_refs: [note.id],
          },
        ]
      : [];
    const interpretation = {
      schema_version: "semantic-interpretation-result.v2",
      source_schema_version: source.schema_version,
      source_id: source.source_id,
      status: "draft",
      draft,
      findings: [],
      coverage: {
        total_blocks: source.evidence_units.length,
        block_dispositions: source.evidence_units.map((unit) => ({
          source_ref: unit.id,
          disposition: "supporting",
        })),
        unparsed_items: [],
      },
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify(
                    failFirst && sources.length === 1
                      ? { invalid: true }
                      : interpretation,
                  ),
                },
              ],
            },
          },
        ],
      }),
    });
  });
  return sources;
}

async function setupKey(page: Page) {
  await page
    .getByRole("textbox", { name: "Gemini API key" })
    .fill("synthetic-sheet-key");
  await page.getByRole("button", { name: "儲存在這個瀏覽器" }).click();
  await expect(page.getByText(/API key 已加密保存在這個瀏覽器/)).toBeVisible();
}
async function storageText(page: Page) {
  return page.evaluate(async () => {
    const values: unknown[] = [{ ...localStorage }];
    for (const info of await indexedDB.databases()) {
      if (!info.name) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(info.name!);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      for (const name of db.objectStoreNames)
        values.push(
          await new Promise((resolve, reject) => {
            const request = db
              .transaction(name, "readonly")
              .objectStore(name)
              .getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          }),
        );
      db.close();
    }
    return JSON.stringify(values);
  });
}
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

test("XLSX selection, same-source retry, mini-grid, confirmation and reload preserve the active trip", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const sources = await mockInterpreter(page, true);
  await page.goto("/");
  await page.getByText("從 JSON 匯入完整行程").click();
  const existing = {
    ...structuredClone(validCanonicalTrip),
    title: "原有確認行程",
  };
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({
    name: "existing.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(existing)),
  });
  await expect(
    page.getByRole("heading", { level: 1, name: "原有確認行程" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "首頁", exact: true }).click();
  await setupKey(page);
  await page.locator('input[type="file"][accept*=".xlsx"]').setInputFiles({
    name: "synthetic.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: syntheticWorkbook(),
  });
  const selection = page.getByRole("region", { name: "選擇要判讀的分頁" });
  await expect(selection).toBeVisible();
  await expect(selection.getByRole("checkbox")).toHaveCount(3);
  await expect(
    selection.getByRole("checkbox", { name: "行程", exact: true }),
  ).toBeChecked();
  await expect(
    selection.getByRole("checkbox", { name: "參考資料", exact: true }),
  ).toBeChecked();
  await expect(
    selection.getByRole("checkbox", { name: "金額", exact: true }),
  ).toBeChecked();
  expect(sources).toHaveLength(0);
  await selection
    .getByRole("checkbox", { name: "金額", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "回到目前行程" }),
  ).toBeVisible();
  await expect(
    selection.getByRole("checkbox", { name: "金額", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "重新送出這份行程" }).click();
  await expect(
    page.getByRole("heading", { name: "對照原文，把行程確認清楚。" }),
  ).toBeVisible();
  expect(sources).toHaveLength(2);
  expect(sources[1]).toEqual(sources[0]);
  expect(JSON.stringify(sources)).not.toMatch(
    /EXCLUDED_EXPENSE_SECRET|HIDDEN_WORKBOOK_SECRET/,
  );
  expect(sources[0]!.excluded_sheets).toEqual(["金額"]);
  await expect(page.getByText(/已選分頁 100% 覆蓋/)).toBeVisible();
  await expect(page.getByText(/金額/).first()).toBeVisible();
  await page.getByRole("button", { name: "查看完整校對內容" }).click();
  const grid = page.getByRole("table").first();
  await expect(grid).toBeVisible();
  await expect(grid.getByText("2026-09-10")).toBeVisible();
  await expect(grid.getByText("自由散步")).toBeVisible();
  const frame = page
    .getByRole("region", { name: "行程 來源表格，可橫向捲動" })
    .first();
  const scroll = await frame.evaluate((element) => ({
    overflow: getComputedStyle(element).overflowX,
    width: element.clientWidth,
    content: element.scrollWidth,
  }));
  expect(scroll.overflow).toBe("auto");
  if ((page.viewportSize()?.width ?? 0) < 600)
    expect(scroll.content).toBeGreaterThan(scroll.width);
  await page.screenshot({
    path: `/tmp/trip-sheet-review-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "確認並使用這份行程" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "合成試算表行程" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "合成試算表行程" }),
  ).toBeVisible();
  const stored = await storageText(page);
  expect(stored).not.toMatch(
    /tabular_region|typed_hint|excluded_sheets|EXCLUDED_EXPENSE_SECRET|HIDDEN_WORKBOOK_SECRET|synthetic-sheet-key|semantic-interpretation-result/,
  );
  expect(errors).toEqual([]);
});

test("empty selection cannot send and selection edits invalidate prepared identity", async ({
  page,
}) => {
  const sources = await mockInterpreter(page, true);
  await page.goto("/");
  await setupKey(page);
  await page.locator('input[type="file"][accept*=".xlsx"]').setInputFiles({
    name: "selection.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: syntheticWorkbook(),
  });
  const selection = page.getByRole("region", { name: "選擇要判讀的分頁" });
  await expect(selection).toBeVisible();
  for (const name of ["行程", "參考資料", "金額"])
    await selection.getByRole("checkbox", { name, exact: true }).uncheck();
  await expect(
    page.getByRole("button", { name: "送給 Gemini 判讀" }),
  ).toBeDisabled();
  await expect(page.getByText("至少選擇一個分頁才能判讀。")).toBeVisible();
  expect(sources).toHaveLength(0);
  await selection.getByRole("checkbox", { name: "行程", exact: true }).check();
  await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  const firstId = sources[0]!.source_id;
  await selection
    .getByRole("checkbox", { name: "參考資料", exact: true })
    .check();
  await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();
  await expect(
    page.getByRole("heading", { name: "對照原文，把行程確認清楚。" }),
  ).toBeVisible();
  expect(sources).toHaveLength(2);
  expect(sources[1]!.source_id).not.toBe(firstId);
});

test("CSV bypasses sheet selection and XLS is rejected without a provider call", async ({
  page,
}) => {
  const errors = collectErrors(page);
  const sources = await mockInterpreter(page);
  await page.goto("/");
  await setupKey(page);
  const input = page.locator('input[type="file"][accept*=".xlsx"]');
  await input.setInputFiles({
    name: "unsupported.xls",
    mimeType: "application/vnd.ms-excel",
    buffer: Buffer.from("unsupported"),
  });
  await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(sources).toHaveLength(0);
  await input.setInputFiles({
    name: "synthetic.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("2026-09-10\n自由散步\n"),
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "送給 Gemini 判讀" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("region", { name: "選擇要判讀的分頁" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "送給 Gemini 判讀" }).click();
  await expect(
    page.getByRole("heading", { name: "對照原文，把行程確認清楚。" }),
  ).toBeVisible();
  expect(sources).toHaveLength(1);
  expect(sources[0]!.source_format).toBe("tabular");
  expect(sources[0]!.input_mode).toBe("csv_file");
  expect(errors).toEqual([]);
});
