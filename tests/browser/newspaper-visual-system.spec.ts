import { expect, test } from "@playwright/test";

test("supported V0 surfaces stay light-paper and rectangular under dark OS preference", async ({
  page,
}) => {
  const remoteFontRequests: string[] = [];
  const consoleErrors: string[] = [];
  page.on("request", (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) {
      remoteFontRequests.push(request.url());
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");

  const homeVisual = await page.locator("body").evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      color: style.color,
      fontFamily: style.fontFamily,
    };
  });
  expect(homeVisual.background).toBe("rgb(255, 255, 255)");
  expect(homeVisual.color).toBe("rgb(18, 18, 18)");
  expect(homeVisual.fontFamily).toContain("Noto Serif TC");

  const headingSize = await page
    .getByRole("heading", { name: /把你已經有的行程/ })
    .evaluate((element) => getComputedStyle(element).fontSize);
  const expectedHeadingSize = await page.evaluate(() =>
    window.innerWidth >= 640 ? "44px" : "27px",
  );
  expect(headingSize).toBe(expectedHeadingSize);

  const sampleAction = page.getByRole("button", {
    name: "先看看大阪 2026 範例",
  });
  await expect(sampleAction).toBeVisible();
  const actionVisual = await sampleAction.evaluate((element) => {
    const style = getComputedStyle(element);
    return { borderRadius: style.borderRadius, boxShadow: style.boxShadow };
  });
  expect(actionVisual.borderRadius).toBe("0px");
  expect(actionVisual.boxShadow).toBe("none");

  await sampleAction.click();
  const elevatedOrRoundedPapers = await page
    .locator(".MuiPaper-root:visible")
    .evaluateAll((elements) =>
      elements
        .map((element) => {
          const style = getComputedStyle(element);
          return {
            background: style.backgroundColor,
            borderRadius: style.borderRadius,
            boxShadow: style.boxShadow,
            text: element.textContent?.trim().slice(0, 80),
          };
        })
        .filter(
          ({ background, borderRadius, boxShadow }) =>
            borderRadius !== "0px" ||
            boxShadow !== "none" ||
            ![
              "rgba(0, 0, 0, 0)",
              "rgb(255, 255, 255)",
              "rgb(245, 244, 241)",
            ].includes(background),
        ),
    );

  expect(elevatedOrRoundedPapers).toEqual([]);

  await page.getByRole("button", { name: "開啟選單" }).click();
  await page.getByRole("button", { name: "預約與票券" }).click();
  const checkedControlColor = await page
    .getByRole("checkbox", { checked: true })
    .first()
    .evaluate(
      (element) =>
        getComputedStyle(element.closest(".MuiCheckbox-root")!).color,
    );
  expect(checkedControlColor).toBe("rgb(18, 18, 18)");

  expect(remoteFontRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
