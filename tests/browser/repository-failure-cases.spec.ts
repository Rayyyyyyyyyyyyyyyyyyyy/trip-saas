import { expect, test } from "@playwright/test";

test("preserves data and reports repository failure states", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixtures/repository-failure-cases.html");

  await expect(page.locator("body")).toHaveAttribute("data-status", "passed");
  const details = JSON.parse(
    (await page.locator("#result").textContent()) ?? "{}",
  ) as Record<string, unknown>;

  expect(details).toEqual({
    abortedTransactionRolledBack: true,
    incompleteCredentialDetected: true,
    invalidCredentialKeyDetected: true,
    invalidTripRecordDetected: true,
    migrationFailurePreservedData: true,
    undecryptableCredentialDetected: true,
    unsupportedPointerDetected: true,
  });
});
