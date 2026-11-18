/// <reference types="@testing-library/jest-dom/vitest" />
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Booking, Platform } from "@platform-booking/api";
import { addDays, toISODate } from "@platform-booking/core";

/** Renders `ui` with a query client of its own. The pages use no router. */
export function renderPage(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const result = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
  return { ...result, queryClient };
}

/** Today plus `days`, as the API writes dates. */
export const day = (days: number) => addDays(toISODate(new Date()), days);

export const platform = (overrides: Partial<Platform> = {}): Platform => ({
  id: "dev01",
  description: "",
  kubernetes: false,
  nightly: false,
  ...overrides,
});

export const booking = (overrides: Partial<Booking> = {}): Booking => ({
  platformId: "dev01",
  trigram: "ABC",
  startDate: day(0),
  endDate: day(2),
  bookedAt: new Date().toISOString(),
  ...overrides,
});
