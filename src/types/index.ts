export interface Platform {
  id: string;
  name: string;
}

export interface PlatformBooking {
  platformId: string;
  trigram: string;
  startDate: string;
  endDate: string;
  bookedAt: string;
}

export interface NavLink {
  label: string;
  to: string;
}
