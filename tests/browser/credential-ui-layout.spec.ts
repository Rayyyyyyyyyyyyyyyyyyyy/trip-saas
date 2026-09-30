import { expect, test } from "@playwright/test";

test("keeps the Gemini credential label, input, and helper text separated", async ({
  page,
}) => {
  await page.goto("/");

  const input = page.getByRole("textbox", { name: "Gemini API key" });
  await expect(input).toBeVisible();
  await input.scrollIntoViewIfNeeded();

  const layout = await input.evaluate((element) => {
    const field = element.closest(".MuiFormControl-root");
    const inputRoot = field?.querySelector(".MuiInputBase-root");
    const label = field?.querySelector(".MuiInputLabel-root");
    const helper = field?.querySelector(".MuiFormHelperText-root");
    const outline = field?.querySelector(".MuiOutlinedInput-notchedOutline");

    if (!field || !inputRoot || !label || !helper || !outline) return null;

    const rect = (target: Element) => {
      const box = target.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        top: box.top,
      };
    };

    return {
      helper: rect(helper),
      input: rect(element),
      inputRoot: rect(inputRoot),
      label: rect(label),
      outline: {
        ...rect(outline),
        borderTopWidth: getComputedStyle(outline).borderTopWidth,
      },
    };
  });

  expect(layout).not.toBeNull();
  expect(layout!.inputRoot.height).toBeGreaterThanOrEqual(50);
  expect(layout!.outline.height).toBeGreaterThanOrEqual(50);
  expect(layout!.outline.borderTopWidth).not.toBe("0px");
  expect(layout!.label.bottom).toBeLessThanOrEqual(layout!.helper.top);
  expect(layout!.inputRoot.bottom).toBeLessThanOrEqual(layout!.helper.top);
});

test("renders Home action buttons and the destructive confirmation dialog", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "管理這台裝置的資料" }).click();
  for (const name of ["清除行程資料", "清除全部本機資料"]) {
    const button = page.getByRole("button", { name });
    const appearance = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderTopWidth: style.borderTopWidth,
        height: element.getBoundingClientRect().height,
      };
    });
    expect(appearance.height).toBeGreaterThanOrEqual(44);
    expect(appearance.borderTopWidth).not.toBe("0px");
  }

  await page.getByRole("button", { name: "清除全部本機資料" }).click();
  const dialog = page.getByRole("dialog", {
    name: "確定清除全部本機資料？",
  });
  await expect(dialog).toBeVisible();

  const dialogAppearance = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      borderTopWidth: style.borderTopWidth,
      width: element.getBoundingClientRect().width,
    };
  });
  expect(dialogAppearance.background).toBe("rgb(255, 255, 255)");
  expect(dialogAppearance.borderTopWidth).not.toBe("0px");
  expect(dialogAppearance.width).toBeGreaterThan(280);

  const actions = dialog.locator(".MuiDialogActions-root");
  expect(
    await actions.evaluate((element) => getComputedStyle(element).padding),
  ).not.toBe("0px");
  await expect(
    dialog.getByRole("button", { name: "清除全部本機資料" }),
  ).toHaveCSS("min-height", "44px");
});

test("uses one divider per Home settings option", async ({ page }) => {
  await page.goto("/");

  const accordions = page.locator(
    'section[aria-labelledby="home-settings-title"] .MuiAccordion-root',
  );
  await expect(accordions).toHaveCount(3);
  const dividers = await accordions.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        bottom: style.borderBottomWidth,
        top: style.borderTopWidth,
      };
    }),
  );

  expect(dividers).toHaveLength(3);
  expect(dividers).toEqual(
    Array.from({ length: 3 }, () => ({ bottom: "1px", top: "0px" })),
  );
});
