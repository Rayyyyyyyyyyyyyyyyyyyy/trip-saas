import { expect, test } from "@playwright/test";

test("supports keyboard date navigation without horizontal overflow", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await page.getByRole("button", { name: "先看看大阪 2026 範例" }).click();
  const firstDate = page.getByRole("tab", { name: "09/10 THU 大阪" });
  const secondDate = page.getByRole("tab", { name: "09/11 FRI 藝術" });

  await firstDate.focus();
  await page.keyboard.press("ArrowRight");
  await expect(secondDate).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { level: 1, name: "森之宮", exact: true }),
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const selectedDateColors = await page
    .getByRole("tab", { name: "09/11 FRI 藝術" })
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color };
    });
  expect(selectedDateColors).toEqual({
    background: "rgb(18, 18, 18)",
    color: "rgb(255, 255, 255)",
  });
  const selectedDateRect = await page
    .getByRole("tab", { name: "09/11 FRI 藝術" })
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        viewport: window.innerWidth,
      };
    });
  expect(selectedDateRect.left).toBeGreaterThanOrEqual(0);
  expect(selectedDateRect.right).toBeLessThanOrEqual(
    selectedDateRect.viewport + 1,
  );

  const disallowedPaperSurfaces = await page
    .locator(".MuiPaper-root:visible")
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const style = getComputedStyle(element);
        const allowed = [
          "rgba(0, 0, 0, 0)",
          "rgb(255, 255, 255)",
          "rgb(245, 244, 241)",
        ];
        return allowed.includes(style.backgroundColor)
          ? []
          : [
              {
                background: style.backgroundColor,
                text: element.textContent?.trim(),
              },
            ];
      }),
    );
  expect(disallowedPaperSurfaces).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("keeps visible travel controls at least 44px on the mobile project", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.name.startsWith("mobile"),
    "mobile-only target audit",
  );

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await page.getByRole("button", { name: "先看看大阪 2026 範例" }).click();
  await page.getByRole("tab", { name: "09/12 SAT 宇治" }).click();

  const undersizedTargets = await page
    .locator("button:visible, a[href]:visible")
    .evaluateAll((elements) =>
      elements
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
    );

  expect(undersizedTargets).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
