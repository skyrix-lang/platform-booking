# apps/bff: backend-for-frontend

Hono on Node. Owns the JSON API, the live updates (`src/live-updates.ts`,
server-sent events on `/api/events`), security headers and serving the built
SPA, plus optional sign-in (OIDC confidential client, on only when `OIDC_*` is
set). Bundled into one file for the image.

- API routes: `createRoute` + Zod in `src/routes/api.ts`, then `yarn api:generate`.
- The data is shared and the routes open. A mutation calls `broadcast()` with
  what changed. Bookings that ended expire inside the transaction that reads
  or writes them (`expireBookings` in `src/bookings.ts`).
- Read settings with `env()` (`src/env.ts`), never `process.env`.
- Log with `log` (`src/log.ts`), never `console`; no secrets or query strings.
- Mail: `mailer().send()` (`src/mail.ts`), rate limited with `hit()`. Unset
  `SMTP_HOST` logs instead of sending; tests rely on that.
- `src/app.test.ts` covers what needs no database; the rest is in `e2e/`.
