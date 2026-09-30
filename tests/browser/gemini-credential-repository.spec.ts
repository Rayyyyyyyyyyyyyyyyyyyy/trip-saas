import { expect, test } from "@playwright/test";

test("persists only encrypted Gemini credential data and clears it explicitly", async ({
  page,
}) => {
  await page.goto("/tests/browser/fixtures/gemini-credential-repository.html");

  await expect(page.locator("body")).toHaveAttribute("data-status", "passed");
  const details = JSON.parse(
    (await page.locator("#result").textContent()) ?? "{}",
  ) as Record<string, unknown>;

  expect(details).toEqual({
    afterClearStatus: "empty",
    ciphertextStored: true,
    durableContainsPlaintext: false,
    keyAlgorithm: "AES-GCM",
    keyExtractable: false,
    loadedCredentialMatches: true,
    localStorageContainsPlaintext: false,
  });
});
