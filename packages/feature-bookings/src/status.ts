import type { BookingStatus } from "@platform-booking/core";

export const statusTone = {
  pending: "warning",
  confirmed: "success",
  cancelled: "danger",
} as const satisfies Record<BookingStatus, string>;
