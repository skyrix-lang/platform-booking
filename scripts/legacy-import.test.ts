import { describe, expect, it } from "vitest";
import { planImport, type LegacyData } from "./legacy-import";

const now = new Date("2030-06-10T12:00:00.000Z");

const booking = {
  platform_id: "dev01",
  trigram: "abc",
  start_date: "2030-06-09",
  end_date: "2030-06-12",
  booked_at: "2030-06-09T08:00:00.000Z",
};

const legacy = (overrides: Partial<LegacyData> = {}): LegacyData => ({
  platforms: [
    { id: "dev01", description: null, kubernetes: 0, nightly: 0 },
    { id: "IT01", description: " Nightly env ", kubernetes: 1, nightly: 1 },
  ],
  bookings: [booking],
  history: [],
  ...overrides,
});

describe("planImport", () => {
  it("maps platforms, normalising ids and flags", () => {
    expect(planImport(legacy(), [], now).platforms).toEqual([
      { id: "dev01", description: "", kubernetes: false, nightly: false },
      {
        id: "it01",
        description: "Nightly env",
        kubernetes: true,
        nightly: true,
      },
    ]);
  });

  it("keeps the current platforms when the old database has none", () => {
    const plan = planImport(legacy({ platforms: undefined }), ["dev01"], now);

    expect(plan.platforms).toBeUndefined();
    expect(plan.bookings).toHaveLength(1);
  });

  it("imports active bookings with the trigram in capitals", () => {
    expect(planImport(legacy(), [], now).bookings).toEqual([
      {
        platformId: "dev01",
        trigram: "ABC",
        startDate: "2030-06-09",
        endDate: "2030-06-12",
        bookedAt: new Date("2030-06-09T08:00:00.000Z"),
      },
    ]);
  });

  it("moves bookings of deleted platforms to the history", () => {
    const plan = planImport(
      legacy({ bookings: [{ ...booking, platform_id: "gone" }] }),
      [],
      now,
    );

    expect(plan.bookings).toEqual([]);
    expect(plan.orphans).toBe(1);
    expect(plan.history).toMatchObject([
      {
        platformId: "gone",
        trigram: "ABC",
        releasedAt: now,
        reason: "released",
      },
    ]);
  });

  it("imports the history, defaulting an unknown reason to released", () => {
    const plan = planImport(
      legacy({
        history: [
          {
            ...booking,
            released_at: "2030-06-09T18:00:00.000Z",
            reason: "expired",
          },
          { ...booking, released_at: "2030-06-09T19:00:00.000Z", reason: "?" },
        ],
      }),
      [],
      now,
    );

    expect(plan.history.map((entry) => entry.reason)).toEqual([
      "expired",
      "released",
    ]);
  });

  it("skips platforms whose id the new app can't address", () => {
    const plan = planImport(
      legacy({
        platforms: [
          { id: "dev01", description: null, kubernetes: 0, nightly: 0 },
          { id: "a/b", description: null, kubernetes: 0, nightly: 0 },
          { id: "has space", description: null, kubernetes: 0, nightly: 0 },
        ],
        bookings: [{ ...booking, platform_id: "a/b" }],
      }),
      [],
      now,
    );

    expect(plan.platforms?.map((platform) => platform.id)).toEqual(["dev01"]);
    expect(plan.skipped).toEqual([
      'platform "a/b": invalid id',
      'platform "has space": invalid id',
    ]);
    // Its booking can't stay active: it goes to the history.
    expect(plan.bookings).toEqual([]);
    expect(plan.history).toMatchObject([
      { platformId: "a/b", reason: "released" },
    ]);
  });

  it("skips active bookings whose trigram isn't three letters", () => {
    const plan = planImport(
      legacy({
        bookings: [
          { ...booking, trigram: "ab" },
          { ...booking, trigram: "AB1" },
          booking,
        ],
      }),
      [],
      now,
    );

    expect(plan.bookings.map((b) => b.trigram)).toEqual(["ABC"]);
    expect(plan.skipped).toEqual([
      "booking dev01/ab: invalid trigram",
      "booking dev01/AB1: invalid trigram",
    ]);
  });

  it("skips rows it can't trust, and says why", () => {
    const plan = planImport(
      legacy({
        bookings: [
          booking,
          { ...booking, trigram: "ABC " },
          {
            ...booking,
            platform_id: "dev01",
            trigram: "xyz",
            end_date: "soon",
          },
        ],
      }),
      [],
      now,
    );

    expect(plan.bookings).toHaveLength(1);
    expect(plan.skipped).toEqual([
      "booking dev01/ABC : duplicate",
      "booking dev01/xyz: invalid date",
    ]);
  });
});
