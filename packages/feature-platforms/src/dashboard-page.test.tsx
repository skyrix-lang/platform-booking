import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import type { CreateBooking } from "@platform-booking/api";
import {
  getCreateBookingMockHandler,
  getListBookingsMockHandler,
  getListPlatformsMockHandler,
  getReleaseBookingMockHandler,
} from "@platform-booking/api/mocks";
import { server } from "@platform-booking/api/test-server";
import { DashboardPage, type DashboardFilters } from "./dashboard-page";
import { booking, day, platform, renderPage } from "./test-utils";

const platforms = [
  platform({ id: "dev02" }),
  platform({ id: "dev01" }),
  platform({ id: "it01", kubernetes: true, nightly: true }),
];

function renderDashboard(
  filters: DashboardFilters = {},
  onFiltersChange = vi.fn<(filters: DashboardFilters) => void>(),
) {
  renderPage(
    <DashboardPage filters={filters} onFiltersChange={onFiltersChange} />,
  );
  return { onFiltersChange };
}

const card = (id: string) =>
  screen
    .getAllByTestId("platform-card")
    .find((element) =>
      within(element).queryByRole("heading", { name: id.toUpperCase() }),
    )!;

const cardIds = () =>
  screen
    .queryAllByTestId("platform-card")
    .map((element) => within(element).getByRole("heading").textContent);

describe("DashboardPage", () => {
  it("groups the platforms by kind, sorted, and counts the free ones", async () => {
    server.use(
      getListPlatformsMockHandler(platforms),
      getListBookingsMockHandler([booking({ platformId: "dev02" })]),
    );
    renderDashboard();

    const swarm = await screen.findByRole("region", {
      name: "Swarm Platforms",
    });
    expect(screen.getByText("2/3 available")).toBeVisible();
    expect(
      within(swarm)
        .getAllByTestId("platform-card")
        .map((element) => within(element).getByRole("heading").textContent),
    ).toEqual(["DEV01", "DEV02"]);
    expect(
      within(
        screen.getByRole("region", { name: "Kubernetes Platforms" }),
      ).getByRole("heading", { name: "IT01" }),
    ).toBeVisible();
    expect(within(card("dev02")).getByText("Booked")).toBeVisible();
    expect(within(card("dev01")).getByText("Available")).toBeVisible();
  });

  it("applies the type and availability filters it is given", async () => {
    server.use(
      getListPlatformsMockHandler(platforms),
      getListBookingsMockHandler([booking({ platformId: "dev02" })]),
    );
    renderDashboard({ type: "swarm", show: "available" });

    await screen.findAllByTestId("platform-card");
    expect(cardIds()).toEqual(["DEV01"]);
    expect(
      screen.queryByRole("region", { name: "Kubernetes Platforms" }),
    ).not.toBeInTheDocument();
  });

  it("reports a filter change", async () => {
    server.use(
      getListPlatformsMockHandler(platforms),
      getListBookingsMockHandler([]),
    );
    const { onFiltersChange } = renderDashboard({ show: "booked" });

    await userEvent.click(
      within(
        await screen.findByRole("group", { name: "Platform type" }),
      ).getByRole("button", { name: "K8S" }),
    );

    expect(onFiltersChange).toHaveBeenCalledWith({
      show: "booked",
      type: "k8s",
    });
  });

  it("searches by id or trigram as you type, then updates the URL", async () => {
    server.use(
      getListPlatformsMockHandler(platforms),
      getListBookingsMockHandler([
        booking({ platformId: "it01", trigram: "XYZ" }),
      ]),
    );
    const { onFiltersChange } = renderDashboard();

    await userEvent.type(
      await screen.findByLabelText("Search platforms"),
      "xy",
    );

    expect(cardIds()).toEqual(["IT01"]);
    await waitFor(() =>
      expect(onFiltersChange).toHaveBeenCalledWith({ q: "xy" }),
    );
  });

  it("says when nothing matches", async () => {
    server.use(
      getListPlatformsMockHandler(platforms),
      getListBookingsMockHandler([]),
    );
    renderDashboard({ q: "nothing" });

    expect(await screen.findByText("No platforms found")).toBeVisible();
  });

  it("books a platform with the trigram and date chosen", async () => {
    let sent: CreateBooking | undefined;
    server.use(
      getListPlatformsMockHandler([platform()]),
      getListBookingsMockHandler([]),
      getCreateBookingMockHandler(async ({ request }) => {
        sent = await request.json();
        return booking();
      }),
    );
    renderDashboard();

    await userEvent.click(
      await screen.findByRole("button", { name: "Book DEV01" }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.type(
      within(dialog).getByLabelText("Your trigram name"),
      "abc",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Confirm" }),
    );

    await waitFor(() =>
      expect(sent).toEqual({
        platformId: "dev01",
        trigram: "ABC",
        endDate: day(0),
      }),
    );
  });

  it("refuses a trigram already on the platform without asking the server", async () => {
    server.use(
      getListPlatformsMockHandler([platform()]),
      getListBookingsMockHandler([booking({ trigram: "ABC" })]),
    );
    renderDashboard();

    await userEvent.click(
      await screen.findByRole("button", { name: "Join DEV01" }),
    );
    const dialog = screen.getByRole("dialog");
    await userEvent.type(
      within(dialog).getByLabelText("Your trigram name"),
      "abc",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Confirm" }),
    );

    expect(
      await within(dialog).findByText("ABC has already booked this platform"),
    ).toBeVisible();
  });

  it("releases a booking", async () => {
    let released: unknown;
    server.use(
      getListPlatformsMockHandler([platform()]),
      getListBookingsMockHandler([booking()]),
      getReleaseBookingMockHandler(({ params }) => {
        released = params;
      }),
    );
    renderDashboard();

    await userEvent.click(
      await screen.findByRole("button", { name: "Release for ABC" }),
    );

    await waitFor(() =>
      expect(released).toMatchObject({ platformId: "dev01", trigram: "ABC" }),
    );
  });

  it("shows the server's reason when booking fails, until dismissed", async () => {
    server.use(
      getListPlatformsMockHandler([platform()]),
      getListBookingsMockHandler([]),
      http.post("*/api/bookings", () =>
        HttpResponse.json(
          { error: "This trigram has already booked this platform" },
          { status: 409 },
        ),
      ),
    );
    renderDashboard();

    await userEvent.click(
      await screen.findByRole("button", { name: "Book DEV01" }),
    );
    await userEvent.type(screen.getByLabelText("Your trigram name"), "ABC");
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "This trigram has already booked this platform",
    );
    await userEvent.click(
      within(alert).getByRole("button", { name: "Dismiss" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
