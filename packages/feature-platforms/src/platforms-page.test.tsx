import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import type { CreatePlatform, UpdatePlatform } from "@platform-booking/api";
import {
  getCreatePlatformMockHandler,
  getDeletePlatformMockHandler,
  getListPlatformsMockHandler,
  getUpdatePlatformMockHandler,
} from "@platform-booking/api/mocks";
import { server } from "@platform-booking/api/test-server";
import { PlatformsPage } from "./platforms-page";
import { platform, renderPage } from "./test-utils";

describe("PlatformsPage", () => {
  it("lists the platforms with their flags", async () => {
    server.use(
      getListPlatformsMockHandler([
        platform({
          id: "it01",
          description: "Nightly env",
          kubernetes: true,
          nightly: true,
        }),
      ]),
    );
    renderPage(<PlatformsPage />);

    const table = await screen.findByRole("table", { name: "Platforms" });
    const row = within(table).getByRole("row", { name: /IT01/ });
    expect(row).toHaveTextContent("Nightly env");
    expect(row).toHaveTextContent("K8S");
    expect(row).toHaveTextContent("Nightly");
  });

  it("creates a platform", async () => {
    let sent: CreatePlatform | undefined;
    server.use(
      getListPlatformsMockHandler([]),
      getCreatePlatformMockHandler(async ({ request }) => {
        sent = await request.json();
        return platform({ id: "qa01" });
      }),
    );
    renderPage(<PlatformsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Add Platform" }),
    );
    await userEvent.type(screen.getByLabelText("Platform ID"), "QA01");
    await userEvent.type(screen.getByLabelText("Description (optional)"), "QA");
    await userEvent.click(screen.getByLabelText("Kubernetes"));
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(sent).toEqual({
        id: "qa01",
        description: "QA",
        kubernetes: true,
        nightly: false,
      }),
    );
  });

  it("asks for an id before sending anything", async () => {
    server.use(getListPlatformsMockHandler([]));
    renderPage(<PlatformsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Add Platform" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Platform ID is required")).toBeVisible();
  });

  it("updates a platform, keeping its id", async () => {
    let sent: UpdatePlatform | undefined;
    server.use(
      getListPlatformsMockHandler([platform()]),
      getUpdatePlatformMockHandler(async ({ request }) => {
        sent = await request.json();
        return platform({ nightly: true });
      }),
    );
    renderPage(<PlatformsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Edit DEV01" }),
    );
    expect(screen.getByLabelText("Platform ID")).toHaveAttribute("readonly");
    await userEvent.click(screen.getByLabelText("Nightly"));
    await userEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(sent).toEqual({
        description: "",
        kubernetes: false,
        nightly: true,
      }),
    );
  });

  it("deletes a platform", async () => {
    let deleted: unknown;
    server.use(
      getListPlatformsMockHandler([platform()]),
      getDeletePlatformMockHandler(({ params }) => {
        deleted = params.id;
      }),
    );
    renderPage(<PlatformsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Delete DEV01" }),
    );

    await waitFor(() => expect(deleted).toBe("dev01"));
  });

  it("shows the server's reason when saving fails", async () => {
    server.use(
      getListPlatformsMockHandler([]),
      http.post("*/api/platforms", () =>
        HttpResponse.json(
          { error: "A platform with this id already exists" },
          { status: 409 },
        ),
      ),
    );
    renderPage(<PlatformsPage />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Add Platform" }),
    );
    await userEvent.type(screen.getByLabelText("Platform ID"), "dev01");
    await userEvent.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A platform with this id already exists",
    );
  });
});
