import {
  createPlatform,
  expect,
  gotoHydrated,
  test,
  uniquePlatformId,
} from "./support";

const row = (page: import("@playwright/test").Page, id: string) =>
  page
    .getByRole("table", { name: "Platforms" })
    .getByRole("row")
    .filter({ hasText: id.toUpperCase() });

test("the footer leads to the platforms page", async ({ page }) => {
  await gotoHydrated(page, "/");

  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Edit platforms" })
    .click();

  await expect(page).toHaveURL("/platforms");
  await expect(
    page.getByRole("heading", { level: 1, name: "Manage Platforms" }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
});

test("adds a platform", async ({ page }) => {
  const id = uniquePlatformId();
  await gotoHydrated(page, "/platforms");

  await page.getByRole("button", { name: "Add Platform" }).click();
  await expect(
    page.getByRole("heading", { name: "New Platform" }),
  ).toBeVisible();
  await page.getByLabel("Platform ID").fill(id.toUpperCase());
  await page.getByLabel("Description (optional)").fill("Test environment");
  await page.getByLabel("Kubernetes").check();
  await page.getByRole("button", { name: "Create" }).click();

  await expect(
    page.getByRole("heading", { name: "New Platform" }),
  ).toBeHidden();
  await expect(row(page, id)).toContainText("Test environment");
  await expect(row(page, id)).toContainText("K8S");
});

test("checks the id before sending it", async ({ page }) => {
  await gotoHydrated(page, "/platforms");
  await page.getByRole("button", { name: "Add Platform" }).click();

  await page.getByRole("button", { name: "Create" }).click();

  await expect(page.getByText("Platform ID is required")).toBeVisible();
});

test.describe("a platform that already exists", () => {
  // The browser logs the refused request as a console error.
  test.use({ allowConsoleErrors: true });

  test("is refused, with the server's reason", async ({ page }) => {
    const { id } = await createPlatform(page.request);
    await gotoHydrated(page, "/platforms");

    await page.getByRole("button", { name: "Add Platform" }).click();
    await page.getByLabel("Platform ID").fill(id);
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "A platform with this id already exists",
    );
  });
});

test("edits a platform's description and flags", async ({ page }) => {
  const { id } = await createPlatform(page.request);
  await gotoHydrated(page, "/platforms");

  await page.getByRole("button", { name: `Edit ${id.toUpperCase()}` }).click();
  await expect(
    page.getByRole("heading", { name: `Edit ${id.toUpperCase()}` }),
  ).toBeVisible();
  await expect(page.getByLabel("Platform ID")).toHaveAttribute("readonly");
  await page.getByLabel("Description (optional)").fill("Renamed");
  await page.getByLabel("Nightly").check();
  await page.getByRole("button", { name: "Update" }).click();

  await expect(row(page, id)).toContainText("Renamed");
  await expect(row(page, id)).toContainText("Nightly");
});

test("deletes a platform", async ({ page }) => {
  const { id } = await createPlatform(page.request);
  await gotoHydrated(page, "/platforms");
  await expect(row(page, id)).toBeVisible();

  await page
    .getByRole("button", { name: `Delete ${id.toUpperCase()}` })
    .click();

  await expect(row(page, id)).toHaveCount(0);
});
