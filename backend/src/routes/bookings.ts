import { Hono } from "hono";

interface PlatformBooking {
  platformId: string;
  trigram: string;
  startDate: string;
  endDate: string;
  bookedAt: string;
}

// In-memory store for now — will be replaced by a database later
const store: PlatformBooking[] = [];

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function cleanExpired() {
  const today = toISODate(new Date());
  for (let i = store.length - 1; i >= 0; i--) {
    if (store[i].endDate < today) {
      store.splice(i, 1);
    }
  }
}

export const bookings = new Hono();

// List all active bookings
bookings.get("/", (c) => {
  cleanExpired();
  return c.json(store);
});

// Create or update a booking
bookings.post("/", async (c) => {
  const body = await c.req.json<{
    platformId: string;
    trigram: string;
    endDate: string;
  }>();

  if (!body.platformId || !body.trigram || !body.endDate) {
    return c.json({ error: "platformId, trigram, and endDate are required" }, 400);
  }

  const trigram = body.trigram.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(trigram)) {
    return c.json({ error: "Trigram must be exactly 3 letters" }, 400);
  }

  // Remove existing booking for this platform
  const idx = store.findIndex((b) => b.platformId === body.platformId);
  if (idx !== -1) store.splice(idx, 1);

  const booking: PlatformBooking = {
    platformId: body.platformId,
    trigram,
    startDate: toISODate(new Date()),
    endDate: body.endDate,
    bookedAt: new Date().toISOString(),
  };

  store.push(booking);
  return c.json(booking, 201);
});

// Release a booking
bookings.delete("/:platformId", (c) => {
  const platformId = c.req.param("platformId");
  const idx = store.findIndex((b) => b.platformId === platformId);

  if (idx === -1) {
    return c.json({ error: "Booking not found" }, 404);
  }

  store.splice(idx, 1);
  return c.json({ ok: true });
});
