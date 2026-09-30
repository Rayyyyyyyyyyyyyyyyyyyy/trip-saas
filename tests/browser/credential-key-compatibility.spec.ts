import { expect, test } from "@playwright/test";

test("persists and reuses a non-extractable AES-GCM key across reload", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixtures/credential-key-roundtrip.html");

  await expect(page.locator("#status")).toHaveAttribute(
    "data-status",
    "passed",
  );

  const details = JSON.parse(
    (await page.locator("#result").textContent()) ?? "{}",
  ) as Record<string, unknown>;

  expect(details).toMatchObject({
    algorithm: "AES-GCM",
    decryptedSentinelMatches: true,
    exportBlocked: true,
    extractable: false,
    keyType: "secret",
    localStorageContainsPlaintext: false,
    localStorageEntryCount: 0,
    secureContext: true,
    usages: expect.arrayContaining(["encrypt", "decrypt"]),
  });
});
