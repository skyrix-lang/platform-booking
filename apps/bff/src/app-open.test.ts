import { beforeAll, describe, expect, it, vi } from "vitest";
import type { createApp as CreateApp } from "./app";

// The server as it runs in production for this site: no sign-in configured
// (no OIDC_* or SESSION_SECRET). Each test file loads its own modules, so the
// settings here don't leak into app.test.ts.

let app: ReturnType<typeof CreateApp>;

beforeAll(async () => {
  vi.stubEnv("PUBLIC_URL", "https://bookings.example.com");
  vi.stubEnv("DATABASE_URL", "postgres://unused@localhost:1/unused");
  for (const name of [
    "SESSION_SECRET",
    "OIDC_ISSUER",
    "OIDC_CLIENT_ID",
    "OIDC_CLIENT_SECRET",
  ]) {
    vi.stubEnv(name, "");
  }
  vi.spyOn(process.stdout, "write").mockReturnValue(true);
  vi.spyOn(process.stderr, "write").mockReturnValue(true);
  const { createApp } = await import("./app");
  app = createApp();
});

describe("without sign-in", () => {
  it("has no sign-in routes", async () => {
    const response = await app.request("/auth/login");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("lets forms post to this site only", async () => {
    const response = await app.request("/robots.txt");

    expect(response.headers.get("content-security-policy")).toContain(
      "form-action 'self';",
    );
  });

  it("answers an unknown API path with a JSON 404", async () => {
    const response = await app.request("/api/does-not-exist");

    expect(response.status).toBe(404);
  });
});

describe("live updates", () => {
  it("streams what changed to every open page, then lets them go", async () => {
    const { broadcast, closeLiveUpdates, liveListenerCount } =
      await import("./live-updates");
    const response = await app.request("/api/events");
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toBe("no-cache");

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const read = async () => decoder.decode((await reader.read()).value);

    expect(await read()).toBe(": connected\n\n");
    expect(liveListenerCount()).toBe(1);

    broadcast("bookings-updated");
    expect(await read()).toBe("data: bookings-updated\n\n");

    closeLiveUpdates();
    expect((await reader.read()).done).toBe(true);
    expect(liveListenerCount()).toBe(0);
  });
});
