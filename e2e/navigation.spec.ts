import {
  bookPlatform,
  createPlatform,
  expect,
  gotoDashboardFor,
  gotoHydrated,
  test,
} from "./support";

test.describe("theme", () => {
  test("is dark by default, and the choice is remembered", async ({ page }) => {
    await gotoHydrated(page, "/");
    const html = page.locator("html");
    await expect(html).toHaveClass(/\bdark\b/);

    await page.getByRole("button", { name: "Light mode" }).click();

    await expect(html).not.toHaveClass(/\bdark\b/);
    await page.reload();
    await expect(html).not.toHaveClass(/\bdark\b/);
    await page.getByRole("button", { name: "Dark mode" }).click();
    await expect(html).toHaveClass(/\bdark\b/);
  });
});

test("light mode is readable too", async ({ page }) => {
  // Axe runs on the page each test ends on: this one ends in light mode, on
  // a dashboard with a booking, so both themes' colours are checked.
  const { id } = await createPlatform(page.request);
  await bookPlatform(page.request, id);
  await gotoDashboardFor(page, id);

  await page.getByRole("button", { name: "Light mode" }).click();

  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
});

test.describe("header", () => {
  test("desktop navigation", async ({ page, isMobile }) => {
    test.skip(isMobile, "the desktop navigation is hidden on mobile");
    await gotoHydrated(page, "/bookings");
    const menuButton = page.getByRole("button", { name: "Open menu" });
    await expect(menuButton).toBeHidden();

    await page
      .getByRole("banner")
      .getByRole("link", { name: "Dashboard" })
      .click();

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Platforms",
    );

    await page
      .getByRole("banner")
      .getByRole("link", { name: "Bookings" })
      .click();

    await expect(page).toHaveURL("/bookings");
    await expect(
      page.getByRole("heading", { name: "Active Bookings" }),
    ).toBeVisible();
  });

  test("mobile menu", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the mobile menu is hidden on desktop");
    await gotoHydrated(page, "/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("link", { name: "Bookings" })).toBeHidden();

    await header.getByRole("button", { name: "Open menu" }).click();

    await expect(
      header.getByRole("button", { name: "Close menu" }),
    ).toHaveAttribute("aria-expanded", "true");

    await header.getByRole("link", { name: "Bookings" }).click();

    await expect(page).toHaveURL("/bookings");
    await expect(header.getByRole("link", { name: "Bookings" })).toBeHidden();
    await expect(
      header.getByRole("button", { name: "Open menu" }),
    ).toBeVisible();
  });
});

test.describe("unknown pages", () => {
  test("show the not-found page, which isn't indexed", async ({ page }) => {
    // The server answers 404 (seo.spec.ts) and the page also asks search
    // engines not to index it.
    await page.goto("/does-not-exist");

    await expect(page).toHaveTitle("Page not found | Platform Booking");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex",
    );

    await page.getByRole("link", { name: "Back to home" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test("an unknown API path is a JSON 404, not the app", async ({
    request,
  }) => {
    const response = await request.get("/api/does-not-exist");

    expect(response.status()).toBe(404);
    expect(response.headers()["content-type"]).toContain("application/json");
  });
});
