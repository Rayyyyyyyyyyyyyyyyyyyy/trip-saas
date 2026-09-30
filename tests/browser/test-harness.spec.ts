import { expect, test } from "@playwright/test";

import { UNCONFIGURED_PARSER_BASE_URL } from "./appServers";

test("serves Home first and opens the Golden Viewer only by explicit action", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Trip Runtime");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "把你已經有的行程，變成旅行當下能用的介面。",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "關西" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "先看看大阪 2026 範例" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: "關西" }),
  ).toBeVisible();
});

test("Home has no horizontal overflow or undersized visible controls", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");

  const audit = await page.evaluate(() => ({
    hasHorizontalOverflow:
      document.documentElement.scrollWidth > window.innerWidth,
    undersizedTargets: [
      ...document.querySelectorAll("button:not([disabled]), a[href]"),
    ]
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          label:
            element.getAttribute("aria-label") || element.textContent?.trim(),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter(({ width, height }) => width < 44 || height < 44),
  }));

  expect(audit.hasHorizontalOverflow).toBe(false);
  expect(audit.undersizedTargets).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("Home input tabs keep readable contrast in selected and unselected states", async ({
  page,
}) => {
  await page.goto("/");

  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(2);
  const auditContrast = async () =>
    tabs.evaluateAll((elements) => {
      const channels = (value: string) =>
        value
          .match(/[\d.]+/g)
          ?.slice(0, 3)
          .map(Number) ?? [];
      const luminance = (value: string) => {
        const [red = 0, green = 0, blue = 0] = channels(value).map(
          (channel) => {
            const normalized = channel / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          },
        );
        return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      };
      const effectiveBackground = (element: Element) => {
        let current: Element | null = element;
        while (current) {
          const background = getComputedStyle(current).backgroundColor;
          if (
            channels(background).length === 3 &&
            !background.endsWith(", 0)")
          ) {
            return background;
          }
          current = current.parentElement;
        }
        return "rgb(255, 255, 255)";
      };

      return elements.map((element) => {
        const color = getComputedStyle(element).color;
        const background = effectiveBackground(element);
        const lighter = Math.max(luminance(color), luminance(background));
        const darker = Math.min(luminance(color), luminance(background));
        return {
          background,
          color,
          label: element.textContent?.trim(),
          ratio: (lighter + 0.05) / (darker + 0.05),
        };
      });
    });

  const initialAudit = await auditContrast();
  expect(initialAudit).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ label: "上傳檔案", ratio: expect.any(Number) }),
      expect.objectContaining({ label: "直接貼上", ratio: expect.any(Number) }),
    ]),
  );
  expect(initialAudit.filter(({ ratio }) => ratio < 4.5)).toEqual([]);

  await page.getByRole("tab", { name: "直接貼上" }).click();
  expect((await auditContrast()).filter(({ ratio }) => ratio < 4.5)).toEqual(
    [],
  );
});

// Runs against the unconfigured build: with no accepted model pinned, Home
// must say so instead of implying an interpretation is on its way.
test("Home reports pending interpretation truthfully and separates local clear scopes", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(`${UNCONFIGURED_PARSER_BASE_URL}/`);

  await page.getByRole("tab", { name: "直接貼上" }).click();
  await page
    .getByRole("textbox", { name: "貼上 Markdown 行程內容" })
    .fill("# Browser flow\n\n- Nested source");
  await page.getByRole("button", { name: "先讀取行程" }).click();
  await expect(page.getByText("內容已讀取，等待 Gemini 判讀")).toBeVisible();
  await expect(
    page.getByRole("progressbar", {
      name: "Gemini 語意判讀等待連接",
    }),
  ).toBeVisible();
  await expect(page.getByText(/尚未連接 Gemini 判讀/)).toBeVisible();
  await expect(page.getByText(/Gemini 判讀與檢查已完成/)).toHaveCount(0);

  await page.getByRole("button", { name: /管理這台裝置的資料/ }).click();
  await page.getByRole("button", { name: "清除行程資料" }).click();
  await expect(
    page.getByRole("dialog", { name: "確定清除行程資料？" }),
  ).toContainText("會保留 Gemini API key");
  await page.getByRole("button", { name: "取消" }).click();

  await page.getByRole("button", { name: "清除全部本機資料" }).click();
  await expect(
    page.getByRole("dialog", { name: "確定清除全部本機資料？" }),
  ).toContainText("所有勾選紀錄和 Gemini API key");
  await page.getByRole("button", { name: "取消" }).click();

  expect(consoleErrors).toEqual([]);
});
