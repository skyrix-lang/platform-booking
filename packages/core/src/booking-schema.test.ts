import { describe, expect, it } from "vitest";
import {
  bookingHistoryEntrySchema,
  createBookingSchema,
  createPlatformSchema,
  updateBookingSchema,
  updatePlatformSchema,
} from "./booking-schema";

describe("createBookingSchema", () => {
  const valid = { platformId: "dev01", trigram: "abc", endDate: "2030-02-01" };

  it("stores the trigram in capitals, without spaces", () => {
    expect(
      createBookingSchema.parse({ ...valid, trigram: " abc " }).trigram,
    ).toBe("ABC");
  });

  const invalid = {
    "a short trigram": { trigram: "AB" },
    "a long trigram": { trigram: "ABCD" },
    "digits in the trigram": { trigram: "AB1" },
    "an invalid date": { endDate: "2030-02-30" },
    "no platform": { platformId: "" },
  };
  for (const [name, override] of Object.entries(invalid)) {
    it(`rejects ${name}`, () => {
      expect(
        createBookingSchema.safeParse({ ...valid, ...override }).success,
      ).toBe(false);
    });
  }
});

describe("updateBookingSchema", () => {
  it("takes the new end date only", () => {
    expect(
      updateBookingSchema.parse({ endDate: "2030-02-01", trigram: "XYZ" }),
    ).toEqual({ endDate: "2030-02-01" });
  });
});

describe("createPlatformSchema", () => {
  it("lowercases the id and defaults the rest", () => {
    expect(createPlatformSchema.parse({ id: " DEV04 " })).toEqual({
      id: "dev04",
      description: "",
      kubernetes: false,
      nightly: false,
    });
  });

  for (const id of ["", "dev 04", "dev/04", "-dev"]) {
    it(`rejects the id "${id}"`, () => {
      expect(createPlatformSchema.safeParse({ id }).success).toBe(false);
    });
  }
});

describe("updatePlatformSchema", () => {
  it("can't change the id", () => {
    const parsed = updatePlatformSchema.parse({ id: "other", nightly: true });
    expect("id" in parsed).toBe(false);
    expect(parsed.nightly).toBe(true);
  });
});

describe("bookingHistoryEntrySchema", () => {
  it("accepts the reasons a booking ends", () => {
    const entry = {
      platformId: "dev01",
      trigram: "ABC",
      startDate: "2030-02-01",
      endDate: "2030-02-03",
      bookedAt: "2030-02-01T08:00:00.000Z",
      releasedAt: "2030-02-02T08:00:00.000Z",
    };
    expect(
      bookingHistoryEntrySchema.safeParse({ ...entry, reason: "expired" })
        .success,
    ).toBe(true);
    expect(
      bookingHistoryEntrySchema.safeParse({ ...entry, reason: "deleted" })
        .success,
    ).toBe(false);
  });
});
