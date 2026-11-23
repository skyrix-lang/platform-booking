import type { Page } from "@playwright/test";
import {
  expect,
  KEYCLOAK_USERS,
  logInOnKeycloak,
  signedOut,
  test,
} from "./support";

// The site is open: nobody has to sign in. Sign-in stays available for when a
// deployment sets OIDC_* (as the tests do), and these check that it is safe.

/** Who /api/me says is signed in on this page. */
async function signedInEmail(page: Page) {
  const response = await page.request.get("/api/me");
  const { user } = (await response.json()) as {
    user: { email: string } | null;
  };
  return user?.email ?? null;
}

test.describe("signed out", () => {
  test.use(signedOut);

  test("every page opens without signing in", async ({ page }) => {
    for (const path of ["/", "/bookings", "/platforms"]) {
      await page.goto(path);
      await expect(page).toHaveURL(path);
    }
    expect(await signedInEmail(page)).toBeNull();
  });

  test("signs in through Keycloak, then comes back", async ({ page }) => {
    await page.goto("/sign-in?returnTo=%2Fplatforms");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.getByRole("link", { name: "Continue to sign in" }).click();
    await logInOnKeycloak(page, KEYCLOAK_USERS.ada);

    await expect(page).toHaveURL("/platforms");
    expect(await signedInEmail(page)).toBe(KEYCLOAK_USERS.ada.email);
  });

  test("ignores a return address on another site", async ({ page }) => {
    await page.goto("/sign-in?returnTo=https%3A%2F%2Fevil.example");
    await page.getByRole("link", { name: "Continue to sign in" }).click();
    await logInOnKeycloak(page, KEYCLOAK_USERS.grace);

    await expect(page).toHaveURL("/bookings");
  });

  test("a wrong password stays on Keycloak", async ({ page }) => {
    await page.goto("/auth/login");
    await logInOnKeycloak(page, { username: "ada", password: "wrong" });

    await expect(page.getByText("Invalid username or password.")).toBeVisible();
  });

  test("a callback without a sign-in in progress is refused", async ({
    page,
  }) => {
    await page.goto("/auth/callback?code=forged&state=forged");

    await expect(page).toHaveURL("/sign-in?error=Expired");
    await expect(page.getByRole("alert")).toContainText("took too long");
  });

  test("the session cookie is HttpOnly and SameSite", async ({
    page,
    context,
  }) => {
    await page.goto("/auth/login");
    await logInOnKeycloak(page, KEYCLOAK_USERS.ada);
    await expect(page).toHaveURL("/bookings");

    const session = (await context.cookies()).find((c) => c.name === "session");
    expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax" });
    expect(await page.evaluate(() => document.cookie)).not.toContain(
      "session=",
    );
  });
});

// Signs in as its own user: signing out would otherwise end the session the
// other tests share.
test.describe("own session", () => {
  test.use(signedOut);

  test("signing out ends the Keycloak session too", async ({ page }) => {
    await page.goto("/auth/login?returnTo=/bookings");
    await logInOnKeycloak(page, KEYCLOAK_USERS.grace);
    await expect(page).toHaveURL("/bookings");
    // Loaded, so signing out doesn't cancel the page's first requests.
    await expect(
      page.getByRole("heading", { level: 1, name: "Active Bookings" }),
    ).toBeVisible();

    // Sign-out is a same-origin form post, as a page offering it would send.
    await page.evaluate(() => {
      const form = document.createElement("form");
      form.method = "post";
      form.action = "/auth/logout";
      document.body.append(form);
      form.submit();
    });

    await expect(page).toHaveURL("/");
    // The app is still starting there: leaving now would interrupt it.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await signedInEmail(page)).toBeNull();
    // Keycloak asks for the password again: its own session ended as well.
    await page.goto("/auth/login");
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  });
});

test.describe("sign-in limits", () => {
  test.use(signedOut);

  test("starts at most 30 sign-ins per client in 15 minutes", async ({
    request,
  }) => {
    for (let started = 0; started < 30; started++) {
      const response = await request.get("/auth/login", { maxRedirects: 0 });
      expect(response.headers().location).toContain(
        "/realms/platform-booking/",
      );
    }

    const refused = await request.get("/auth/login", { maxRedirects: 0 });

    expect(refused.headers().location).toBe("/sign-in?error=RateLimited");
  });
});
