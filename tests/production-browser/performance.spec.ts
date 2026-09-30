import { expect, test } from "@playwright/test";

import { validCanonicalTrip } from "../fixtures/contracts/validContracts";

test("measures mobile cold start and confirmed-trip reopen with delayed resources", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "production-mobile-chrome");

  const coldStartedAt = Date.now();
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "把你已經有的行程，變成旅行當下能用的介面。",
    }),
  ).toBeVisible();
  const coldVisibleMs = Date.now() - coldStartedAt;
  const coldNavigation = await page.evaluate(() => {
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    return {
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
      loadMs: Math.round(navigation.loadEventEnd),
      transferredBytes: resources.reduce(
        (total, resource) => total + resource.transferSize,
        0,
      ),
      fontRequests: resources.filter((resource) =>
        resource.name.includes(".woff2"),
      ).length,
    };
  });

  await page.getByText("從 JSON 匯入完整行程").click();
  await page.locator('input[accept*="application/json"]').setInputFiles({
    name: "performance-confirmed-trip.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(validCanonicalTrip)),
  });
  await expect(
    page.getByRole("heading", { level: 1, name: validCanonicalTrip.title! }),
  ).toBeVisible();

  await page.route("**/*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.continue();
  });
  const reopenStartedAt = Date.now();
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: validCanonicalTrip.title! }),
  ).toBeVisible();
  const delayedReopenVisibleMs = Date.now() - reopenStartedAt;

  const metrics = {
    coldVisibleMs,
    delayedReopenVisibleMs,
    ...coldNavigation,
  };
  console.log(`MOBILE_PERFORMANCE ${JSON.stringify(metrics)}`);
  expect(metrics.coldVisibleMs).toBeGreaterThan(0);
  expect(metrics.delayedReopenVisibleMs).toBeGreaterThanOrEqual(200);
});
