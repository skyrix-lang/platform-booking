# packages/theme-platform-booking

Platform Booking's brand, kept from the previous version: indigo on grey, dark
by default with a light mode (`.dark` on `<html>`, `apps/web/src/theme.ts`).
CSS variables only (`src/theme.css`), the same set as `theme-default`. Keep
text at WCAG 2.2 AA contrast in both modes: the e2e axe checks run in dark
(the default) and, in `e2e/navigation.spec.ts`, in light.
