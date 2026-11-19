# Architecture

How the code is organized, and the JSON API between the web app and the BFF.

## Structure

```
apps/
  web/                      the customer app (thin)
    index.html              HTML shell: metadata crawlers read first
    src/routes/             TanStack Router file routes (/, /bookings, /platforms, /sign-in)
    src/overrides.ts        typed page overrides for a customer
    src/styles.css          Tailwind + UI kit + the customer's theme
  bff/                      Hono server
    src/app.ts              security headers, CSRF, routes, static SPA
    src/routes/api.ts       JSON API, declared with Zod (OpenAPI)
    src/routes/auth.ts      /auth/login, /auth/callback, /auth/logout (only with OIDC_*)
    src/live-updates.ts     /api/events: tells every open page when data changes
    src/session.ts          server-side sessions (HttpOnly cookie)
    src/env.ts              settings, checked at startup
    src/mail.ts             mail over SMTP (logged when unconfigured)
packages/
  core/                     Zod schemas and types shared by web and BFF
  db/                       Drizzle schema, migrations (drizzle/), seed data
  api/                      openapi.json + generated client, hooks and MSW mocks
  ui/                       UI kit on theme tokens
  theme-default/            the starter's brand, kept as the reference token set
  theme-platform-booking/   this site's brand: one CSS-variable file
  feature-platforms/        the dashboard, bookings and platforms screens
e2e/                        Playwright tests
scripts/                    setup, dev, session, API generation, boundary check,
                            import of the previous version's data
docker/                     Dockerfile, compose files, Keycloak development realm
docs/decisions.md           decisions and their reasons
docs/specs/                 feature specs
```

Each package has a short `AGENTS.md` with its rules.

## API

The JSON API lives under `/api`. Its OpenAPI document is at
`/api/openapi.json`, and `packages/api/openapi.json` is the committed copy.

| Method   | Path                                   | What it does                                                   |
| -------- | -------------------------------------- | -------------------------------------------------------------- |
| `GET`    | `/api/platforms`                       | every platform                                                 |
| `POST`   | `/api/platforms`                       | add one (409 if the id exists)                                 |
| `PUT`    | `/api/platforms/{id}`                  | change its description and flags                               |
| `DELETE` | `/api/platforms/{id}`                  | delete it; its bookings move to the history as released        |
| `GET`    | `/api/bookings`                        | the active bookings (ended ones expire first)                  |
| `POST`   | `/api/bookings`                        | book from today until `endDate` (409 if that trigram is on it) |
| `PATCH`  | `/api/bookings/{platformId}/{trigram}` | change the end date                                            |
| `DELETE` | `/api/bookings/{platformId}/{trigram}` | release; it moves to the history                               |
| `GET`    | `/api/bookings/history`                | the last three weeks of released and expired bookings          |
| `GET`    | `/api/events`                          | server-sent events: `bookings-updated`, `platforms-updated`    |
| `GET`    | `/api/health`, `/api/me`               | health check; the signed-in user, or `null`                    |

- Everything is shared and open: no route needs a session.
- Trigrams are three letters, stored in capitals; platform ids are stored in
  lowercase. Bad input gets 400 with `{ error, issues }`, a missing platform or
  booking 404, and a refused rule (a nightly platform past today, an end date
  in the past) 400 with `{ error }`.
- Each change is announced on `/api/events`, and every open page refetches.
  Behind a proxy, don't buffer that path (the server sends
  `X-Accel-Buffering: no`, which nginx honours), and serve browsers over
  HTTP/2: over HTTP/1.1 each open tab holds one of the browser's six
  connections to the site, and a seventh tab would stall.

To change the API, edit `apps/bff/src/routes/api.ts`, run `yarn api:generate`
and commit both. `yarn verify` fails when the generated client is stale.
