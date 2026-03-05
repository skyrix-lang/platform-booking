export interface Booking {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  status: BookingStatus;
}

export type BookingStatus = "pending" | "confirmed" | "cancelled";

export interface NavLink {
  label: string;
  to: string;
}
