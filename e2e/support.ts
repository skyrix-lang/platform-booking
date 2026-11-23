import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type ConsoleMessage,
  type Page,
} from "@playwright/test";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import {
  addDays,
  toISODate,
  type Booking,
  type Platform,
} from "@platform-booking/core";
import { createLocalSession, storageState } from "../scripts/local-session";

/**
 * Every test also fails on:
 * - a console error or uncaught exception in the app (not on Keycloak's
 *   pages). Tests that trigger an error on purpose opt out with
 *   `test.use({ allowConsoleErrors: true })`.
 * - an accessibility violation (WCAG 2.2 AA, checked with axe) on the app
 *   page the test ends on, in Chromium and WebKit.
 * With E2E_COVERAGE=1 (`yarn test:coverage`), each test in Chromium also
 * records which of the app's code ran in the browser (scripts/coverage.ts).
 */
export const test = base.extend<{
  allowConsoleErrors: boolean;
  failOnConsoleError: void;
  checkAccessibility: void;
  browserCoverage: void;
}>({
  // Sign-ins are rate limited per client address, which the app reads from
  // x-forwarded-for. Each test gets its own, as if from its own machine, so
  // parallel tests don't share a limit.
  // (`provide` is Playwright's `use`, renamed so it isn't taken for React's.)
  extraHTTPHeaders: async ({ extraHTTPHeaders }, provide) => {
    await provide({ ...extraHTTPHeaders, "x-forwarded-for": randomIp() });
  },
  allowConsoleErrors: [false, { option: true }],
  failOnConsoleError: [
    async ({ page, allowConsoleErrors, baseURL }, use) => {
      const errors: string[] = [];
      const fromApp = () => page.url().startsWith(baseURL!);
      // An unknown address answers 404 on purpose (apps/bff/src/app.ts), and
      // the browser reports the page's own status as an error: not the app's.
      const pageNotFound = (message: ConsoleMessage) =>
        message.text().startsWith("Failed to load resource") &&
        message.text().includes("status of 404") &&
        message.location().url === page.url();
      page.on("console", (message) => {
        if (message.type() === "error" && fromApp() && !pageNotFound(message))
          errors.push(message.text());
      });
      page.on("pageerror", (error) => {
        if (fromApp()) errors.push(error.message);
      });

      await use();

      if (!allowConsoleErrors) expect(errors).toEqual([]);
    },
    { auto: true },
  ],
  checkAccessibility: [
    async ({ page, baseURL, browserName }, use, testInfo) => {
      await use();
      if (testInfo.status !== testInfo.expectedStatus) return;
      if (!page.url().startsWith(baseURL!)) return;
      // firefox 159 (playwright 1.65) crashes while axe checks some pages;
      // chromium and webkit check the same pages; see docs/decisions.md.
      if (browserName === "firefox") return;
      // Colours are only final once fades end, such as a card that a live
      // update brings in, which can happen while axe runs: reduced motion
      // turns the fades off (motion-safe:), then the running ones finish.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(() =>
        // A cancelled animation rejects: it's over all the same.
        Promise.allSettled(document.getAnimations().map((a) => a.finished)),
      );
      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        violations.map(
          ({ id, nodes }) => `${id}: ${nodes.map((n) => n.target).join(", ")}`,
        ),
      ).toEqual([]);
    },
    { auto: true },
  ],
  browserCoverage: [
    async ({ page, browserName, baseURL }, use) => {
      // Only Chromium can report coverage.
      if (!process.env.E2E_COVERAGE || browserName !== "chromium") {
        await use();
        return;
      }
      // Only the test's own page: a page it opens itself isn't recorded.
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
      await use();
      const entries = await page.coverage.stopJSCoverage();
      // The app's own bundles, each with its source map from the build, so
      // the report shows source files rather than minified bundles.
      const assets = `${baseURL}/assets/`;
      const ours = await Promise.all(
        entries
          .filter((entry) => entry.url.startsWith(assets))
          .map(async (entry) => {
            const file = `apps/web/dist/assets/${entry.url.slice(assets.length).split("?")[0]}`;
            const map = await readFile(`${file}.map`, "utf8").catch(() => "");
            if (!map) return entry;
            // Sources as absolute paths: the map's are relative to itself.
            const sourceMap = JSON.parse(map) as { sources: string[] };
            sourceMap.sources = sourceMap.sources.map((source) =>
              resolve(dirname(file), source),
            );
            return { ...entry, sourceMap };
          }),
      );
      if (ours.length === 0) return;
      // Loaded only when recording, so a plain `yarn test` doesn't pay for it.
      const { CoverageReport } = await import("monocart-coverage-reports");
      const { E2E_COVERAGE_OPTIONS } =
        await import("../scripts/coverage-options");
      await new CoverageReport(E2E_COVERAGE_OPTIONS).add(ours);
    },
    { auto: true },
  ],
});

export { expect };

/** An address in 198.18.0.0/15, a range reserved for testing. */
function randomIp() {
  const [a = 0, b = 0, c = 0] = randomBytes(3);
  return `198.${18 + (a % 2)}.${b}.${c}`;
}

/** A platform id no other test uses. */
export function uniquePlatformId() {
  return `e2e-${randomUUID().slice(0, 8)}`;
}

/** Three random capital letters. */
export function randomTrigram() {
  return Array.from(randomBytes(3), (byte) =>
    String.fromCharCode(65 + (byte % 26)),
  ).join("");
}

/** A day `days` from today, as the server and the browser count it. */
export function dayFromToday(days: number) {
  return addDays(toISODate(new Date()), days);
}

/**
 * Tests run in parallel against one database, so a test that changes data
 * creates its own platform, with a unique id, and leaves the seed data alone.
 */
export async function createPlatform(
  request: APIRequestContext,
  overrides: Partial<Platform> = {},
): Promise<Platform> {
  const response = await request.post("/api/platforms", {
    data: {
      id: uniquePlatformId(),
      description: "Created by a test",
      ...overrides,
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

export async function bookPlatform(
  request: APIRequestContext,
  platformId: string,
  { trigram = randomTrigram(), endDate = dayFromToday(2) } = {},
): Promise<Booking> {
  const response = await request.post("/api/bookings", {
    data: { platformId, trigram, endDate },
  });
  expect(response.status()).toBe(201);
  return response.json();
}

async function withDatabase<T>(run: (db: Client) => Promise<T>) {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    return await run(db);
  } finally {
    await db.end();
  }
}

/**
 * Writes a booking straight to the database, such as one whose end date has
 * passed, which the API can't create.
 */
export async function insertBooking(booking: {
  platformId: string;
  trigram: string;
  startDate: string;
  endDate: string;
}) {
  await withDatabase((db) =>
    db.query(
      "INSERT INTO bookings (platform_id, trigram, start_date, end_date) VALUES ($1, $2, $3, $4)",
      [booking.platformId, booking.trigram, booking.startDate, booking.endDate],
    ),
  );
}

/** Ends a user's sessions directly in the database, as if they had expired. */
export async function deleteSessionsFromDatabase(email: string) {
  await withDatabase((db) =>
    db.query(
      "DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)",
      [email],
    ),
  );
}

/** A storage state signed in as `email`, written straight to the database. */
export async function createSessionFor(email: string, baseURL: string) {
  const db = drizzle(process.env.DATABASE_URL!);
  try {
    const { token, expiresAt } = await createLocalSession(db, email);
    return storageState(new URL(baseURL), token, expiresAt);
  } finally {
    await db.$client.end();
  }
}

/** Signs this browser context in as a new user of its own. Returns the email. */
export async function signInAsNewUser(
  context: BrowserContext,
  baseURL: string,
) {
  const email = uniqueEmail();
  const state = await createSessionFor(email, baseURL);
  await context.addCookies(state.cookies);
  return email;
}

/**
 * Opens a page and waits until the app has rendered it, for tests that depend
 * on client behaviour. Everything is rendered by JavaScript, so the header
 * showing means React is running.
 */
export async function gotoHydrated(page: Page, url: string) {
  await page.goto(url);
  await expect(page.getByRole("banner")).toBeVisible();
}

/** A platform's card on the dashboard. */
export function platformCard(page: Page, platformId: string) {
  return page.getByTestId("platform-card").filter({
    has: page.getByRole("heading", {
      name: platformId.toUpperCase(),
      exact: true,
    }),
  });
}

/** The dashboard, searched down to the platform `platformId`. */
export async function gotoDashboardFor(page: Page, platformId: string) {
  await gotoHydrated(page, `/?q=${platformId}`);
  await expect(platformCard(page, platformId)).toBeVisible();
}

export function uniqueEmail(domain = "example.test") {
  return `e2e-${randomUUID()}@${domain}`;
}

/** For tests that start signed out, or sign in as their own user. */
export const signedOut = { storageState: { cookies: [], origins: [] } };

/** The users in docker/keycloak/realm.json. */
export const KEYCLOAK_USERS = {
  ada: { username: "ada", password: "ada", email: "ada@example.test" },
  grace: { username: "grace", password: "grace", email: "grace@example.test" },
  // Only for e2e/account-linking.spec.ts, which needs users nobody else signs in as.
  linus: { username: "linus", password: "linus", email: "linus@example.test" },
  // Claims victim@example.test without having verified it.
  mallory: {
    username: "mallory",
    password: "mallory",
    email: "victim@example.test",
  },
} as const;

/** A user created ahead of their first sign-in: an email, no identity yet. */
export async function createUser(email: string) {
  await withDatabase((db) =>
    db.query("INSERT INTO users (email) VALUES ($1)", [email]),
  );
}

/** The users with this email, and whether each is linked to an identity. */
export async function usersWithEmail(email: string) {
  return withDatabase(async (db) => {
    const { rows } = await db.query<{ linked: boolean }>(
      "SELECT oidc_subject IS NOT NULL AS linked FROM users WHERE email = $1",
      [email],
    );
    return rows;
  });
}

/** Fills in Keycloak's login form, which must be open. */
export async function logInOnKeycloak(
  page: Page,
  user: { username: string; password: string },
) {
  await page.getByLabel("Username or email").fill(user.username);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Sign In" }).click();
}
