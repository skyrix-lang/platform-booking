import type { Locator, Page } from "@playwright/test";
import { parseISODate } from "@platform-booking/core";
import {
  bookPlatform,
  createPlatform,
  dayFromToday,
  expect,
  gotoDashboardFor,
  gotoHydrated,
  platformCard,
  randomTrigram,
  test,
} from "./support";

/** Picks `iso` in the dialog's calendar, moving to its month if needed. */
async function pickDate(dialog: Locator, iso: string) {
  const name = parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const day = dialog.getByRole("button", { name, exact: true });
  if (!(await day.isVisible())) {
    await dialog.getByRole("button", { name: "Next month" }).click();
  }
  await day.click();
}

const dialogOf = (page: Page) => page.getByRole("dialog");

test("shows the platforms, grouped, with how many are free", async ({
  page,
}) => {
  await gotoHydrated(page, "/");

  await expect(page).toHaveTitle("Platform Booking");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Platforms");
  await expect(page.getByText(/^\d+\/\d+ available$/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Swarm Platforms" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Kubernetes Platforms" }),
  ).toBeVisible();
  await expect(platformCard(page, "it01")).toContainText("Redeployed nightly");
});

test("books a free platform", async ({ page }) => {
  const { id } = await createPlatform(page.request);
  await gotoDashboardFor(page, id);
  const card = platformCard(page, id);
  await expect(card).toContainText("Available");

  await card.getByRole("button", { name: `Book ${id.toUpperCase()}` }).click();
  const dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: "Book Platform" }),
  ).toBeVisible();
  await expect(dialog.getByLabel("Your trigram name")).toBeFocused();
  await dialog.getByLabel("Your trigram name").fill("abc");
  await pickDate(dialog, dayFromToday(2));
  await expect(dialog).toContainText("(3d)");
  await dialog.getByRole("button", { name: "Confirm" }).click();

  await expect(dialog).toBeHidden();
  await expect(card).toContainText("Booked");
  await expect(card).toContainText("ABC");
  await expect(card.getByRole("button", { name: /^Join/ })).toBeVisible();
});

test("checks the trigram before booking", async ({ page }) => {
  const { id } = await createPlatform(page.request);
  await gotoDashboardFor(page, id);

  await platformCard(page, id).getByRole("button", { name: /^Book/ }).click();
  const dialog = dialogOf(page);
  await dialog.getByLabel("Your trigram name").fill("a1");
  await dialog.getByRole("button", { name: "Confirm" }).click();

  await expect(
    dialog.getByText("Trigram must be exactly 3 letters"),
  ).toBeVisible();
  await expect(dialog.getByLabel("Your trigram name")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
});

test("joins a booked platform, but not twice with the same trigram", async ({
  page,
}) => {
  const { id } = await createPlatform(page.request);
  const first = await bookPlatform(page.request, id, { trigram: "AAA" });
  await gotoDashboardFor(page, id);
  const card = platformCard(page, id);

  await card.getByRole("button", { name: `Join ${id.toUpperCase()}` }).click();
  const dialog = dialogOf(page);
  await expect(dialog).toContainText(`Also here: ${first.trigram}`);
  await dialog.getByLabel("Your trigram name").fill("aaa");
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(
    dialog.getByText("AAA has already booked this platform"),
  ).toBeVisible();

  await dialog.getByLabel("Your trigram name").fill("BBB");
  await dialog.getByRole("button", { name: "Confirm" }).click();

  await expect(card).toContainText("2 users");
  await expect(card).toContainText("BBB");
});

test("changes a booking's end date", async ({ page }) => {
  const { id } = await createPlatform(page.request);
  const { trigram } = await bookPlatform(page.request, id, {
    endDate: dayFromToday(0),
  });
  await gotoDashboardFor(page, id);
  const card = platformCard(page, id);
  await expect(card).toContainText("(1d)");

  await card.getByRole("button", { name: `Edit date for ${trigram}` }).click();
  const dialog = dialogOf(page);
  await expect(
    dialog.getByRole("heading", { name: "Edit Release Date" }),
  ).toBeVisible();
  // Nothing to confirm until the date changes.
  await expect(dialog.getByRole("button", { name: "Confirm" })).toBeDisabled();
  await pickDate(dialog, dayFromToday(1));
  await dialog.getByRole("button", { name: "Confirm" }).click();

  await expect(dialog).toBeHidden();
  await expect(card).toContainText("(2d)");
});

test("releases a booking", async ({ page }) => {
  const { id } = await createPlatform(page.request);
  const { trigram } = await bookPlatform(page.request, id);
  await gotoDashboardFor(page, id);
  const card = platformCard(page, id);

  await card.getByRole("button", { name: `Release for ${trigram}` }).click();

  await expect(card).toContainText("Available");
  await expect(card).not.toContainText(trigram);
});

test("a nightly platform can only be booked until today", async ({ page }) => {
  const { id } = await createPlatform(page.request, { nightly: true });
  await gotoDashboardFor(page, id);
  await expect(platformCard(page, id)).toContainText("Redeployed nightly");

  await platformCard(page, id).getByRole("button", { name: /^Book/ }).click();
  const dialog = dialogOf(page);
  const tomorrow = parseISODate(dayFromToday(1)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  if (parseISODate(dayFromToday(1)).getDate() === 1) {
    await dialog.getByRole("button", { name: "Next month" }).click();
  }

  await expect(
    dialog.getByRole("button", { name: tomorrow, exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("filters by type and availability, kept in the URL", async ({ page }) => {
  const { id } = await createPlatform(page.request, { kubernetes: true });
  await gotoHydrated(page, "/");

  await page
    .getByRole("group", { name: "Platform type" })
    .getByRole("button", { name: "K8S" })
    .click();
  await expect(page).toHaveURL("/?type=k8s");
  await expect(
    page.getByRole("heading", { name: "Swarm Platforms" }),
  ).toBeHidden();

  await page
    .getByRole("group", { name: "Availability" })
    .getByRole("button", { name: "Booked" })
    .click();
  await expect(page).toHaveURL("/?type=k8s&show=booked");
  await expect(platformCard(page, id)).toBeHidden();

  await page.getByRole("button", { name: "Available" }).click();
  await page.getByLabel("Search platforms").fill(id);
  await expect(page).toHaveURL(`/?type=k8s&show=available&q=${id}`);
  await expect(page.getByTestId("platform-card")).toHaveCount(1);

  await page.getByLabel("Search platforms").fill("no-such-platform");
  await expect(page.getByText("No platforms found")).toBeVisible();
});

test("searches by who booked", async ({ page }) => {
  const { id } = await createPlatform(page.request);
  const trigram = randomTrigram();
  await bookPlatform(page.request, id, { trigram });
  await gotoHydrated(page, "/");

  await page.getByLabel("Search platforms").fill(trigram.toLowerCase());

  await expect(platformCard(page, id)).toBeVisible();
});

test("shows other people's changes without reloading", async ({
  page,
  browser,
}) => {
  const { id } = await createPlatform(page.request);
  await gotoDashboardFor(page, id);
  const card = platformCard(page, id);
  await expect(card).toContainText("Available");

  // Someone else, elsewhere.
  const other = await browser.newContext();
  const { trigram } = await bookPlatform(other.request, id);
  await other.close();

  await expect(card).toContainText(trigram);
  await expect(card).toContainText("Booked");
});

test.describe("when booking fails", () => {
  // The browser logs the refused request as a console error.
  test.use({ allowConsoleErrors: true });

  test("says why, and the message can be dismissed", async ({ page }) => {
    const { id } = await createPlatform(page.request);
    await gotoDashboardFor(page, id);
    await platformCard(page, id).getByRole("button", { name: /^Book/ }).click();
    const dialog = dialogOf(page);
    await dialog.getByLabel("Your trigram name").fill("ABC");
    // Someone books with the same trigram meanwhile.
    await bookPlatform(page.request, id, { trigram: "ABC" });

    await dialog.getByRole("button", { name: "Confirm" }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toContainText(
      "This trigram has already booked this platform",
    );
    await alert.getByRole("button", { name: "Dismiss" }).click();
    await expect(alert).toBeHidden();
  });

  test("falls back to a general message when the server fails", async ({
    page,
  }) => {
    const { id } = await createPlatform(page.request);
    await gotoDashboardFor(page, id);
    await page.route("**/api/bookings", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ status: 502, body: "Bad gateway" })
        : route.fallback(),
    );
    await platformCard(page, id).getByRole("button", { name: /^Book/ }).click();
    await dialogOf(page).getByLabel("Your trigram name").fill("ABC");
    await dialogOf(page).getByRole("button", { name: "Confirm" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Failed to book platform",
    );
  });
});
