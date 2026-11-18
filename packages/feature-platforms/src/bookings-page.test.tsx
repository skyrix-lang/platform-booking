import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  getListBookingHistoryMockHandler,
  getListBookingsMockHandler,
  getListPlatformsMockHandler,
  getReleaseBookingMockHandler,
} from "@platform-booking/api/mocks";
import { server } from "@platform-booking/api/test-server";
import { BookingsPage } from "./bookings-page";
import { booking, day, platform, renderPage } from "./test-utils";

describe("BookingsPage", () => {
  it("lists the active bookings, soonest end first, and the history", async () => {
    server.use(
      getListPlatformsMockHandler([platform()]),
      getListBookingsMockHandler([
        booking({ trigram: "LTR", endDate: day(5) }),
        booking({ trigram: "NOW", endDate: day(0) }),
      ]),
      getListBookingHistoryMockHandler([
        {
          ...booking({ trigram: "OLD" }),
          releasedAt: new Date().toISOString(),
          reason: "expired",
        },
      ]),
    );
    renderPage(<BookingsPage />);

    const active = await screen.findByRole("table", {
      name: "Active bookings",
    });
    const rows = within(active).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("NOW"),
      expect.stringContaining("LTR"),
    ]);
    expect(rows[0]).toHaveTextContent("1d left");
    const history = screen.getByRole("table", { name: "Booking history" });
    expect(within(history).getByRole("row", { name: /OLD/ })).toHaveTextContent(
      "Expired",
    );
  });

  it("releases a booking", async () => {
    let released: unknown;
    server.use(
      getListPlatformsMockHandler([platform()]),
      getListBookingsMockHandler([booking()]),
      getListBookingHistoryMockHandler([]),
      getReleaseBookingMockHandler(({ params }) => {
        released = params;
      }),
    );
    renderPage(<BookingsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Release for ABC on DEV01" }),
    );

    await waitFor(() =>
      expect(released).toMatchObject({ platformId: "dev01", trigram: "ABC" }),
    );
  });
});
