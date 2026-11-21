import type { Page } from "@playwright/test";
import { expect, gotoHydrated, test } from "./support";

// The header's theme and language controls, remembered in this browser. Each
// test ends on the page it changed, so axe checks it in that theme or
// language.

/** The header, with the menu open on a phone, where the controls live there. */
async function header(page: Page) {
  const banner = page.getByRole("banner");
  const menu = banner.getByRole("button", {
    name: /^(Open menu|Ouvrir le menu)$/,
  });
  if (await menu.isVisible()) await menu.click();
  return banner;
}

test.describe("theme", () => {
  test("is dark by default, then the visitor's choice", async ({ page }) => {
    await gotoHydrated(page, "/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/\bdark\b/);

    const banner = await header(page);
    await banner.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(html).not.toHaveClass(/\bdark\b/);

    await banner.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(html).toHaveClass(/\bdark\b/);
  });

  test("the switch follows the system while the page is open", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    // The visitor chose "system" earlier (the default is dark).
    await page.addInitScript(() =>
      localStorage.setItem(
        "preferences",
        JSON.stringify({
          state: { theme: "system", language: null },
          version: 1,
        }),
      ),
    );
    await gotoHydrated(page, "/");
    const banner = await header(page);
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    await expect(
      banner.getByRole("button", { name: "Switch to dark theme" }),
    ).toBeVisible();

    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(
      banner.getByRole("button", { name: "Switch to light theme" }),
    ).toBeVisible();
  });

  test("is dark from the first paint after a reload", async ({ page }) => {
    await gotoHydrated(page, "/");

    // Hold the app's script back: only public/theme.js has run.
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route("**/assets/*.js", async (route) => {
      await held;
      await route.continue();
    });
    try {
      await page.reload({ waitUntil: "commit" });
      await expect(page.locator("html")).toHaveClass(/\bdark\b/);
      await expect(page.getByRole("banner")).toHaveCount(0);
    } finally {
      release();
    }
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  });
});

test.describe("language", () => {
  // English only (LANGUAGES in packages/core/src/site.ts): no picker, and a
  // French browser still gets English.
  test.use({ locale: "fr-FR" });

  test("is English, with no picker", async ({ page }) => {
    await gotoHydrated(page, "/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("link", { name: "Edit platforms" }),
    ).toBeVisible();
    await expect(
      (await header(page)).getByRole("combobox", { name: "Language" }),
    ).toHaveCount(0);
  });
});
