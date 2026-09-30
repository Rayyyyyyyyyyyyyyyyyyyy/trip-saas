import { expect, test } from "@playwright/test";

test("durable storage excludes source, Review, provider, and credential plaintext", async ({
  page,
}) => {
  await page.goto(
    "/tests/browser/fixtures/persistence-storage-inspection.html",
  );

  await expect(page.locator("body")).toHaveAttribute("data-status", "passed");
  const details = JSON.parse(
    (await page.locator("#result").textContent()) ?? "{}",
  ) as Record<string, unknown>;

  expect(details).toEqual({
    activeTripPreserved: true,
    contaminatedWriteRejected: true,
    credentialPlaintextAbsent: true,
    credentialReloaded: true,
    forbiddenSourceAndReviewStateAbsent: true,
    provenanceAllowlistExact: true,
  });
});
