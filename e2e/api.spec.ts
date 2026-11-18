import type {
  Booking,
  BookingHistoryEntry,
  Platform,
} from "@platform-booking/core";
import {
  bookPlatform,
  createPlatform,
  dayFromToday,
  expect,
  insertBooking,
  randomTrigram,
  signedOut,
  test,
  uniquePlatformId,
} from "./support";

// The API is open: no sign-in, as in the previous version. These run signed
// out, so nothing depends on a session. They send the Origin a browser sends:
// without it, the CSRF check takes a DELETE with no body for a form post.
test.use({
  ...signedOut,
  extraHTTPHeaders: { origin: process.env.PUBLIC_URL! },
});

async function history(request: Parameters<typeof bookPlatform>[0]) {
  const response = await request.get("/api/bookings/history");
  expect(response.status()).toBe(200);
  return (await response.json()) as BookingHistoryEntry[];
}

test.describe("platforms", () => {
  test("lists the default platforms, by id", async ({ request }) => {
    const response = await request.get("/api/platforms");

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const platforms: Platform[] = await response.json();
    expect(platforms).toContainEqual({
      id: "it01",
      description: "",
      kubernetes: true,
      nightly: true,
    });
    const ids = platforms.map((platform) => platform.id);
    expect(ids).toEqual([...ids].sort());
  });

  test("creates one, with its id in lowercase", async ({ request }) => {
    const id = uniquePlatformId();

    const response = await request.post("/api/platforms", {
      data: { id: ` ${id.toUpperCase()} `, kubernetes: true },
    });

    expect(response.status()).toBe(201);
    expect(await response.json()).toEqual({
      id,
      description: "",
      kubernetes: true,
      nightly: false,
    });
  });

  test("refuses a second platform with the same id", async ({ request }) => {
    const { id } = await createPlatform(request);

    const response = await request.post("/api/platforms", { data: { id } });

    expect(response.status()).toBe(409);
  });

  for (const id of ["", "has space", "a/b"]) {
    test(`refuses the id "${id}"`, async ({ request }) => {
      const response = await request.post("/api/platforms", { data: { id } });

      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({ error: "Invalid request" });
    });
  }

  test("updates its description and flags", async ({ request }) => {
    const { id } = await createPlatform(request);

    const response = await request.put(`/api/platforms/${id}`, {
      data: { description: "Staging", nightly: true },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      id,
      description: "Staging",
      kubernetes: false,
      nightly: true,
    });
  });

  test("returns 404 for an unknown platform", async ({ request }) => {
    const update = await request.put(`/api/platforms/${uniquePlatformId()}`, {
      data: {},
    });
    const remove = await request.delete(`/api/platforms/${uniquePlatformId()}`);

    expect(update.status()).toBe(404);
    expect(remove.status()).toBe(404);
  });

  test("deleting one releases its bookings into the history", async ({
    request,
  }) => {
    const { id } = await createPlatform(request);
    const { trigram } = await bookPlatform(request, id);

    const response = await request.delete(`/api/platforms/${id}`);

    expect(response.status()).toBe(204);
    const bookings: Booking[] = await (
      await request.get("/api/bookings")
    ).json();
    expect(bookings.some((b) => b.platformId === id)).toBe(false);
    expect(await history(request)).toContainEqual(
      expect.objectContaining({ platformId: id, trigram, reason: "released" }),
    );
  });
});

test.describe("bookings", () => {
  test("books from today, with the trigram in capitals", async ({
    request,
  }) => {
    const { id } = await createPlatform(request);
    const endDate = dayFromToday(3);

    const response = await request.post("/api/bookings", {
      data: { platformId: id, trigram: " abc ", endDate },
    });

    expect(response.status()).toBe(201);
    const booking: Booking = await response.json();
    expect(booking).toMatchObject({
      platformId: id,
      trigram: "ABC",
      startDate: dayFromToday(0),
      endDate,
    });
    expect(Date.parse(booking.bookedAt)).not.toBeNaN();
    const bookings: Booking[] = await (
      await request.get("/api/bookings")
    ).json();
    expect(bookings).toContainEqual(booking);
  });

  test("lets several people share a platform, each once", async ({
    request,
  }) => {
    const { id } = await createPlatform(request);
    await bookPlatform(request, id, { trigram: "AAA" });
    await bookPlatform(request, id, { trigram: "BBB" });

    const again = await request.post("/api/bookings", {
      data: { platformId: id, trigram: "aaa", endDate: dayFromToday(1) },
    });

    expect(again.status()).toBe(409);
    expect(await again.json()).toEqual({
      error: "This trigram has already booked this platform",
    });
  });

  test("books a nightly platform for today only", async ({ request }) => {
    const { id } = await createPlatform(request, { nightly: true });

    const tomorrow = await request.post("/api/bookings", {
      data: { platformId: id, trigram: "ABC", endDate: dayFromToday(1) },
    });
    const today = await request.post("/api/bookings", {
      data: { platformId: id, trigram: "ABC", endDate: dayFromToday(0) },
    });

    expect(tomorrow.status()).toBe(400);
    expect(await tomorrow.json()).toEqual({
      error: "Nightly platforms can only be booked for 1 day",
    });
    expect(today.status()).toBe(201);
  });

  test("refuses an end date in the past", async ({ request }) => {
    const { id } = await createPlatform(request);

    const response = await request.post("/api/bookings", {
      data: { platformId: id, trigram: "ABC", endDate: dayFromToday(-1) },
    });

    expect(response.status()).toBe(400);
  });

  test("returns 404 for an unknown platform", async ({ request }) => {
    const response = await request.post("/api/bookings", {
      data: {
        platformId: uniquePlatformId(),
        trigram: "ABC",
        endDate: dayFromToday(1),
      },
    });

    expect(response.status()).toBe(404);
  });

  const invalidBookings = {
    "a two-letter trigram": { trigram: "AB" },
    "digits in the trigram": { trigram: "AB1" },
    "an invalid date": { endDate: "2030-02-30" },
    "no platform": { platformId: "" },
  };
  for (const [name, override] of Object.entries(invalidBookings)) {
    test(`refuses ${name}`, async ({ request }) => {
      const response = await request.post("/api/bookings", {
        data: {
          platformId: "dev01",
          trigram: "ABC",
          endDate: dayFromToday(1),
          ...override,
        },
      });

      expect(response.status()).toBe(400);
      expect(await response.json()).toMatchObject({ error: "Invalid request" });
    });
  }

  test("changes the end date", async ({ request }) => {
    const { id } = await createPlatform(request);
    const { trigram } = await bookPlatform(request, id);

    const response = await request.patch(
      `/api/bookings/${id}/${trigram.toLowerCase()}`,
      { data: { endDate: dayFromToday(5) } },
    );

    expect(response.status()).toBe(200);
    expect((await response.json()).endDate).toBe(dayFromToday(5));
  });

  test("refuses to move an end date into the past, or past today on a nightly platform", async ({
    request,
  }) => {
    const { id } = await createPlatform(request, { nightly: true });
    const { trigram } = await bookPlatform(request, id, {
      endDate: dayFromToday(0),
    });

    for (const endDate of [dayFromToday(-1), dayFromToday(1)]) {
      const response = await request.patch(`/api/bookings/${id}/${trigram}`, {
        data: { endDate },
      });
      expect(response.status()).toBe(400);
    }
  });

  test("returns 404 when changing or releasing an unknown booking", async ({
    request,
  }) => {
    const { id } = await createPlatform(request);

    const update = await request.patch(`/api/bookings/${id}/ZZZ`, {
      data: { endDate: dayFromToday(1) },
    });
    const release = await request.delete(`/api/bookings/${id}/ZZZ`);
    const badTrigram = await request.delete(`/api/bookings/${id}/not-one`);

    expect(update.status()).toBe(404);
    expect(release.status()).toBe(404);
    expect(badTrigram.status()).toBe(404);
  });

  test("releasing a booking moves it to the history", async ({ request }) => {
    const { id } = await createPlatform(request);
    const booking = await bookPlatform(request, id);

    const response = await request.delete(
      `/api/bookings/${id}/${booking.trigram}`,
    );

    expect(response.status()).toBe(204);
    const [entry] = (await history(request)).filter(
      (entry) => entry.platformId === id,
    );
    expect(entry).toMatchObject({ ...booking, reason: "released" });
    expect(Date.parse(entry!.releasedAt)).not.toBeNaN();
  });

  test("a booking past its end date expires into the history", async ({
    request,
  }) => {
    const { id } = await createPlatform(request);
    const trigram = randomTrigram();
    await insertBooking({
      platformId: id,
      trigram,
      startDate: dayFromToday(-3),
      endDate: dayFromToday(-1),
    });

    const bookings: Booking[] = await (
      await request.get("/api/bookings")
    ).json();

    expect(bookings.some((b) => b.platformId === id)).toBe(false);
    expect(await history(request)).toContainEqual(
      expect.objectContaining({ platformId: id, trigram, reason: "expired" }),
    );
    // Expired, it no longer blocks booking again.
    await bookPlatform(request, id, { trigram });
  });
});

test.describe("requests the server refuses", () => {
  test("malformed JSON", async ({ request }) => {
    const response = await request.post("/api/bookings", {
      headers: { "content-type": "application/json" },
      data: "{not json",
    });

    expect(response.status()).toBe(400);
  });

  test("a body that isn't JSON", async ({ request, baseURL }) => {
    const response = await request.post("/api/platforms", {
      headers: { "content-type": "text/plain", origin: baseURL! },
      data: JSON.stringify({ id: uniquePlatformId() }),
    });

    expect(response.status()).toBe(415);
  });

  // text/plain is a type that a form on another site can send without CORS.
  test("a cross-site form-like post", async ({ request }) => {
    const response = await request.post("/api/platforms", {
      headers: { "content-type": "text/plain", origin: "https://evil.example" },
      data: JSON.stringify({ id: uniquePlatformId() }),
    });

    expect(response.status()).toBe(403);
  });
});

test("GET /api/health answers when the database is up", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
});

test("/api/me says nobody is signed in", async ({ request }) => {
  const response = await request.get("/api/me");

  expect(await response.json()).toEqual({ user: null });
});

test("the API document lists every route", async ({ request }) => {
  const document = await (await request.get("/api/openapi.json")).json();

  expect(Object.keys(document.paths).sort()).toEqual([
    "/api/bookings",
    "/api/bookings/history",
    "/api/bookings/{platformId}/{trigram}",
    "/api/health",
    "/api/me",
    "/api/platforms",
    "/api/platforms/{id}",
  ]);
});
