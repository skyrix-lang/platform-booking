import {
  createUser,
  expect,
  KEYCLOAK_USERS,
  logInOnKeycloak,
  signedOut,
  test,
  usersWithEmail,
} from "./support";

// apps/bff/src/users.ts: a user created ahead of their first sign-in (by
// `yarn dev:session`, or by email in advance) is linked to the identity on
// that sign-in, but only when the provider has verified the email. Each case
// uses its own Keycloak user, and runs once: the first sign-in is the one
// that links.
test.describe.configure({ mode: "serial" });
test.use(signedOut);

test("a verified email links to the existing user", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "the first sign-in links; run it once",
  );
  await createUser(KEYCLOAK_USERS.linus.email);

  await page.goto("/auth/login?returnTo=/");
  await logInOnKeycloak(page, KEYCLOAK_USERS.linus);
  await expect(page).toHaveURL("/");

  expect(await usersWithEmail(KEYCLOAK_USERS.linus.email)).toEqual([
    { linked: true },
  ]);
});

test("an unverified email doesn't take over someone's account", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "the first sign-in links; run it once",
  );
  await createUser(KEYCLOAK_USERS.mallory.email);

  await page.goto("/auth/login?returnTo=/");
  await logInOnKeycloak(page, KEYCLOAK_USERS.mallory);
  await expect(page).toHaveURL("/");

  // The existing user stays unlinked, and the unverified address isn't
  // shown as theirs.
  expect(await usersWithEmail(KEYCLOAK_USERS.mallory.email)).toEqual([
    { linked: false },
  ]);
  const { user } = await (await page.request.get("/api/me")).json();
  expect(user?.email).not.toBe(KEYCLOAK_USERS.mallory.email);
});
