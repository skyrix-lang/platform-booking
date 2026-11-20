// What the site calls itself. The public address is configuration, read by the
// BFF from PUBLIC_URL when the container starts, not baked into the build.
export const site = {
  name: "Platform Booking",
  description:
    "Book the team's test platforms: see which are free, who is on each and until when, and release them when you're done.",
};

/**
 * The languages the interface is translated into, the default first. A
 * visitor gets the first one their browser asks for, or the default, and can
 * switch in the header when there is more than one. Each language needs its
 * messages in every package's `locales/` folder; drop one here to stop
 * offering it. Keep `lang` in apps/web/index.html on the default.
 */
// English only: the platforms screens aren't translated, and a half-French
// site is worse than an English one. Add "fr" (and its messages) to offer it.
export const LANGUAGES = ["en"] as const;
export type Language = (typeof LANGUAGES)[number];

/** Pages that should rank: listed in the sitemap. App pages aren't. */
export const PUBLIC_PATHS = ["/"] as const;
