import {
  bookPlatform,
  createPlatform,
  dayFromToday,
  expect,
  gotoHydrated,
  test,
} from "./support";

test("lists the active bookings, soonest end first", async ({ page }) => {
  const { id } = await createPlatform(page.request);
  await bookPlatform(page.request, id, {
    trigram: "LTR",
    endDate: dayFromToday(5),
  });
  await bookPlatform(page.request, id, {
    trigram: "NOW",
    endDate: dayFromToday(0),
  });
  await gotoHydrated(page, "/bookings");

  await expect(
    page.getByRole("heading", { level: 1, name: "Active Bookings" }),
  ).toBeVisible();
  const rows = page
    .getByRole("table", { name: "Active bookings" })
    .getByRole("row")
    .filter({ hasText: id.toUpperCase() });
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("NOW");
  await expect(rows.nth(0)).toContainText("1d left");
  await expect(rows.nth(1)).toContainText("LTR");
  await expect(rows.nth(1)).toContainText("6d left");
});

test("releasing a booking moves it to the history", async ({ page }) => {
  const { id } = await createPlatform(page.request);
  const { trigram } = await bookPlatform(page.request, id);
  await gotoHydrated(page, "/bookings");
  const who = `${trigram} on ${id.toUpperCase()}`;

  await page.getByRole("button", { name: `Release for ${who}` }).click();

  await expect(
    page
      .getByRole("table", { name: "Active bookings" })
      .getByRole("row", { name: new RegExp(id.toUpperCase()) }),
  ).toHaveCount(0);
  const entry = page
    .getByRole("table", { name: "Booking history" })
    .getByRole("row")
    .filter({ hasText: id.toUpperCase() });
  await expect(entry).toContainText(trigram);
  await expect(entry).toContainText("Released");
});

test("changes an end date from the list", async ({ page }) => {
  const { id } = await createPlatform(page.request);
  const { trigram } = await bookPlatform(page.request, id, {
    endDate: dayFromToday(0),
  });
  await gotoHydrated(page, "/bookings");

  await page
    .getByRole("button", {
      name: `Edit date for ${trigram} on ${id.toUpperCase()}`,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(`${id.toUpperCase()} · ${trigram}`);
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await expect(dialog).toBeHidden();
});

test("the bookings page isn't indexed", async ({ page }) => {
  await gotoHydrated(page, "/bookings");

  await expect(page).toHaveTitle("Bookings | Platform Booking");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex",
  );
});
