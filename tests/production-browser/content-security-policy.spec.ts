import { expect, test } from "@playwright/test";

test("the production-built entry loads MUI/assets and enforces its portable CSP", async ({
  page,
}) => {
  const diagnostics: string[] = [];
  page.on("console", (message) => diagnostics.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => diagnostics.push(`pageerror: ${error.message}`));
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

  await page.goto("/");
  await page.waitForTimeout(500);
  expect(
    await page.locator("body").innerHTML(),
    diagnostics.join("\n"),
  ).toContain("把你已經有的行程");
  await expect(
    page.getByRole("heading", {
      name: "把你已經有的行程，變成旅行當下能用的介面。",
    }),
  ).toBeVisible();
  await expect(page.locator(".MuiButton-root").first()).toBeVisible();
  expect(
    await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute(
      "content",
    ),
  ).toContain(
    "connect-src 'self' https://generativelanguage.googleapis.com",
  );

  await page.evaluate(() => {
    void fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/csp-probe:generateContent",
    ).catch(() => undefined);
    void fetch("https://example.com/credential-probe").catch(() => undefined);
  });

  await expect.poll(() => geminiRequestObserved).toBe(true);
  await page.waitForTimeout(250);
  expect(unapprovedRequestObserved).toBe(false);
});
