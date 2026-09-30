import { expect, test } from "@playwright/test";

test("atomically replaces one validated active CanonicalTrip", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixtures/confirmed-trip-repository.html");

  await expect(page.locator("body")).toHaveAttribute("data-status", "passed");
  const details = JSON.parse(
    (await page.locator("#result").textContent()) ?? "{}",
  ) as Record<string, unknown>;

  expect(details).toMatchObject({
    afterRejectedReplacementId: "browser-test:replacement",
    firstActiveId: "golden:osaka-2026",
    initialStatus: "empty",
    invalidRejected: true,
    legacyReadAsV2: true,
    secondActiveId: "browser-test:replacement",
    storedTripCount: 1,
  });
});
