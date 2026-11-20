# apps/web: the app

Thin by design: routes (`src/routes`), the theme import (`src/styles.css`) and
the light/dark switch (`src/theme.ts`, `public/theme.js`), page overrides
(`src/overrides.ts`) and layout (header, footer, live updates in
`__root.tsx`). Feature screens come from `packages/feature-*`.

- Routes are TanStack Router file routes; `src/routeTree.gen.ts` is generated
  (commit it, never edit it).
- App routes call `usePageMeta` with `noindex`. No route asks for a sign-in:
  the site is open. URL state (the dashboard's filters) is validated in
  `validateSearch` and passed to the feature's page as props.
- Never import `@platform-booking/db` or anything server-side.
- The root layout (`src/routes/__root.tsx`) has no container: each page is
  `page-section` > `page-container` (AGENTS.md, "Typography and layout").
