// What the site calls itself. The public address is configuration, read by the
// BFF from PUBLIC_URL when the container starts, not baked into the build.
export const site = {
  name: "Platform Booking",
  description:
    "Book the team's test platforms: see which are free, who is on each and until when, and release them when you're done.",
};

/** Pages that should rank: listed in the sitemap. App pages aren't. */
export const PUBLIC_PATHS = ["/"] as const;
