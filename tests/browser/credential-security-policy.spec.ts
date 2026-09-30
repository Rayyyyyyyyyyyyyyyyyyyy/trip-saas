import { expect, test } from "@playwright/test";

test("allows Gemini and blocks an unapproved credential destination", async ({
  page,
}) => {
  let geminiRequestObserved = false;
  let unapprovedRequestObserved = false;

  await page.route(
    "https://generativelanguage.googleapis.com/**",
    async (route) => {
      geminiRequestObserved = true;
      await route.fulfill({
        body: "{}",
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        status: 200,
      });
    },
  );
  await page.route("https://example.com/**", async (route) => {
    unapprovedRequestObserved = true;
    await route.fulfill({ status: 200 });
  });

  await page.goto("/tests/browser/fixtures/csp-connect-src.html");

  await expect(page.locator("body")).toHaveAttribute("data-status", "started");
  await expect.poll(() => geminiRequestObserved).toBe(true);
  await page.waitForTimeout(500);
  expect(geminiRequestObserved).toBe(true);
  expect(unapprovedRequestObserved).toBe(false);
});
