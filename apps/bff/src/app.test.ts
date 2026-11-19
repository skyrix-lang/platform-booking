import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { createApp as CreateApp } from "./app";

// The parts of the server that need no database, with sign-in configured:
// security headers, the CSRF check, input validation and the SEO files. The
// e2e tests cover the rest; app-open.test.ts runs it without sign-in.

let app: ReturnType<typeof CreateApp>;

beforeAll(async () => {
  vi.stubEnv("PUBLIC_URL", "https://bookings.example.com");
  vi.stubEnv("DATABASE_URL", "postgres://unused@localhost:1/unused");
  vi.stubEnv("SESSION_SECRET", "test-secret");
  vi.stubEnv("OIDC_ISSUER", "https://id.example.com/realms/platform-booking");
  vi.stubEnv("OIDC_CLIENT_ID", "platform-booking-web");
  vi.stubEnv("OIDC_CLIENT_SECRET", "secret");
  const { createApp } = await import("./app");
  app = createApp();
});

// Captures what the server logs, which also keeps it out of the test output.
const stdout = vi.spyOn(process.stdout, "write").mockReturnValue(true);
const stderr = vi.spyOn(process.stderr, "write").mockReturnValue(true);
const text = (stream: typeof stdout) =>
  stream.mock.calls.map(([line]) => String(line)).join("");
const logged = () => text(stdout);
afterEach(() => {
  stdout.mockClear();
  stderr.mockClear();
});

describe("the request log", () => {
  it("logs each request once, with the id it returns", async () => {
    const response = await app.request("/robots.txt");
    const id = response.headers.get("x-request-id");

    expect(id).toBeTruthy();
    expect(logged().trim().split("\n")).toEqual([
      expect.stringMatching(
        new RegExp(
          `^INFO Request requestId=${id} method=GET path=/robots.txt status=200 durationMs=\\d+$`,
        ),
      ),
    ]);
  });

  it("keeps the id sent by the proxy in front of it", async () => {
    const response = await app.request("/robots.txt", {
      headers: { "x-request-id": "from-the-proxy" },
    });

    expect(response.headers.get("x-request-id")).toBe("from-the-proxy");
    expect(logged()).toContain("requestId=from-the-proxy");
  });

  it("puts the request's id on what is logged while handling it", async () => {
    // The test database address answers nothing, so the health check fails.
    const response = await app.request("/api/health", {
      headers: { "x-request-id": "health-1" },
    });

    expect(response.status).toBe(503);
    const lines = text(stderr).split("\n");
    expect(lines).toContainEqual(
      expect.stringMatching(
        /^ERROR Health check: database unreachable requestId=health-1 /,
      ),
    );
    expect(lines).toContainEqual(
      expect.stringMatching(/^ERROR Request requestId=health-1 .* status=503 /),
    );
  });

  it("leaves the query string out: it can carry a sign-in code", async () => {
    await app.request("/robots.txt?code=one-time-secret");

    expect(logged()).toContain("path=/robots.txt status=200");
    expect(logged()).not.toContain("one-time-secret");
  });
});

describe("the API", () => {
  // Validation answers before the database is asked, which isn't reachable here.
  for (const [method, path, body] of [
    ["POST", "/api/bookings", { platformId: "dev01", trigram: "AB" }],
    ["POST", "/api/platforms", { id: "has space" }],
    ["PATCH", "/api/bookings/dev01/ABC", { endDate: "2030-02-30" }],
    ["PUT", "/api/platforms/dev01", { kubernetes: "yes" }],
  ] as const) {
    it(`refuses ${method} ${path} with invalid input`, async () => {
      const response = await app.request(path, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ error: "Invalid request" });
    });
  }

  it("serves its OpenAPI document", async () => {
    const { openApiDocument } = await import("./routes/api");
    expect(Object.keys(openApiDocument().paths ?? {}).sort()).toEqual([
      "/api/bookings",
      "/api/bookings/history",
      "/api/bookings/{platformId}/{trigram}",
      "/api/health",
      "/api/me",
      "/api/platforms",
      "/api/platforms/{id}",
    ]);
  });
});

describe("security", () => {
  it("sends a strict content security policy", async () => {
    const response = await app.request("/robots.txt");
    const csp = response.headers.get("content-security-policy");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("unsafe-inline");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("form-action 'self' https://id.example.com");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("strict-transport-security")).toContain(
      "max-age=",
    );
  });

  it("refuses a sign-out form posted from another site", async () => {
    const response = await app.request("/auth/logout", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
        "content-type": "application/x-www-form-urlencoded",
      },
    });
    expect(response.status).toBe(403);
  });
});

describe("SEO files", () => {
  it("builds robots.txt and the sitemap from PUBLIC_URL", async () => {
    const robots = await (await app.request("/robots.txt")).text();
    expect(robots).toContain("Disallow: /api/");
    expect(robots).toContain(
      "Sitemap: https://bookings.example.com/sitemap.xml",
    );

    const sitemap = await (await app.request("/sitemap.xml")).text();
    expect(sitemap).toContain("<loc>https://bookings.example.com/</loc>");
    expect(sitemap).not.toContain("/bookings<");
  });
});
