import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  daysUntil,
  isValidISODate,
  parseISODate,
  toISODate,
} from "./dates";

describe("toISODate and parseISODate", () => {
  it("round-trip a local calendar day", () => {
    expect(toISODate(parseISODate("2030-02-28"))).toBe("2030-02-28");
    expect(toISODate(new Date(2030, 0, 5, 23, 59))).toBe("2030-01-05");
  });
});

describe("isValidISODate", () => {
  it("accepts a real day", () => {
    expect(isValidISODate("2028-02-29")).toBe(true);
  });

  for (const value of ["2030-02-30", "2030-13-01", "2030-1-01", "tomorrow"]) {
    it(`rejects ${value}`, () => {
      expect(isValidISODate(value)).toBe(false);
    });
  }
});

describe("addDays", () => {
  it("crosses months and years", () => {
    expect(addDays("2030-12-31", 1)).toBe("2031-01-01");
    expect(addDays("2030-03-01", -21)).toBe("2030-02-08");
  });
});

describe("daysUntil", () => {
  const now = new Date(2030, 5, 10, 9, 0);

  it("counts today, so the last day is 1", () => {
    expect(daysUntil("2030-06-10", now)).toBe(1);
    expect(daysUntil("2030-06-11", now)).toBe(2);
    expect(daysUntil("2030-06-17", now)).toBe(8);
  });

  it("is 0 once the end date has passed, never negative", () => {
    expect(daysUntil("2030-06-01", now)).toBe(0);
  });
});

describe("daysBetween", () => {
  it("counts both ends", () => {
    expect(daysBetween("2030-06-10", "2030-06-10")).toBe(1);
    expect(daysBetween("2030-06-10", "2030-06-12")).toBe(3);
  });
});
