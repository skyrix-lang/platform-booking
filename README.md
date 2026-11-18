# Platform Booking

Book the team's test platforms: see which are free, who is on each and until
when, book or join one with your trigram, change the end date, and release it
when you're done. There is no sign-in: anyone who can reach the site can book,
as before. Changes show up for everyone at once.

This version replaces the previous one (React, Fastify and SQLite in one
container) with the same pages, content and behaviour, rebuilt on
[project-starter](https://github.com/skyrix-lang/project-starter): a React SPA
and a backend-for-frontend (BFF) shipped as one Docker image, with Postgres.

- **Dashboard** (`/`): every platform as a card, grouped into Swarm and
  Kubernetes, with search (by platform or trigram) and type and availability
  filters kept in the URL. Book a free platform, join a booked one, change an
  end date or release. A nightly platform can only be booked until today.
- **Bookings** (`/bookings`): the active bookings, soonest end first, and the
  last three weeks of history (released or expired).
- **Platforms** (`/platforms`, linked from the footer): add, edit and delete
  platforms. Deleting one releases its bookings.

A booking ends after its end date: it then moves to the history as expired.

## Stack

- **Web:** React 19 single-page app with strict TypeScript and Vite. TanStack
  Router for typed routes and TanStack Query for server data. shadcn/ui-style
  components on Base UI, Tailwind CSS v4, React Hook Form and Zod 4.
- **BFF (backend-for-frontend):** Hono on Node. It serves the JSON API from
  PostgreSQL through Drizzle, pushes live updates as server-sent events, sets
  the security headers and serves the built SPA. OpenID Connect sign-in (a
  confidential client, sessions in an HttpOnly cookie) is there, off by
  default.
- **Contract:** the BFF's routes produce an OpenAPI document. Orval generates
  the typed client, the TanStack Query hooks and the MSW mocks from it.
- **Quality:** oxlint (type-aware) and oxfmt from [oxc.rs](https://oxc.rs),
  Vitest with MSW, Playwright with axe (WCAG 2.2 AA), and dependency rules
  between packages.

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

## Keeping up to date with the starter

The project was created with `yarn rename platform-booking "Platform Booking"`
from the starter; `.starter.json` records the starter commit it started from.

- **Versions:** Renovate updates every repository with one policy, the
  starter's `default.json`; each `renovate.json` only extends it. Install the
  Renovate GitHub app on each repository.
- **Everything else** (scripts, CI, Docker, configs, packages): in the project,
  `yarn sync-from-starter --dry-run`, then `yarn sync-from-starter`. It merges
  what changed in the starter since the commit in `.starter.json` with the
  project's own changes, as `git merge` would. Review, `yarn verify`, commit.

The whole process, conflicts and the rules for changing the starter:
[docs/starter-sync.md](docs/starter-sync.md).

## Getting started

Requires Node 24 (`.nvmrc`), Corepack (`corepack enable`) and Docker.

```bash
yarn install
yarn setup        # .env, Postgres, Keycloak, database and migrations
yarn dev          # http://localhost:3000
```

`yarn setup` adds the default platforms (`packages/db/src/seed.ts`). Nobody
needs to sign in. Sign-in stays available for development and the tests: with
the `OIDC_*` settings `yarn setup` writes, `/sign-in` signs in as `ada` / `ada`
or `grace` / `grace` on the local Keycloak (admin console at
http://localhost:8180, admin / admin). No page asks for it.

`yarn dev` runs the BFF (port 3001, restarts on change) and Vite (port 3000).
Vite forwards `/api` (the live updates included) and `/auth` to the BFF, so the browser sees a single
origin, as in production.

## Scripts

| Command                                           | What it does                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| `yarn dev`                                        | BFF and Vite dev servers                                                  |
| `yarn build` / `yarn start`                       | production build; serve it with the BFF                                   |
| `yarn verify`                                     | format, types, type-aware lint, boundaries, API contract, unit tests      |
| `yarn test`                                       | Playwright against the production build (Postgres and Keycloak in Docker) |
| `yarn test:unit` / `yarn test:watch`              | Vitest                                                                    |
| `yarn api:generate`                               | OpenAPI document from the BFF's routes, then client, hooks and mocks      |
| `yarn setup`                                      | prepare a checkout or worktree                                            |
| `yarn rename <name> ["Display Name"]`             | once, in a new project: replace the starter's name everywhere             |
| `yarn sync-from-starter [--dry-run]`              | in a project: merge in what changed in the starter since the last sync    |
| `yarn dev:session [email]`                        | sign in locally without Keycloak, print the cookie                        |
| `yarn db:generate --name=<x>` / `yarn db:migrate` | new migration / apply migrations                                          |
| `yarn db:seed`                                    | add the default platforms when there are none                             |
| `yarn db:import-sqlite <file>`                    | once: import the previous version's SQLite data (see [Deploy](#deploy))   |
| `yarn db:up` / `yarn keycloak:up`                 | start the local containers                                                |
| `yarn docker:build`                               | build the image                                                           |
| `yarn docker:up` / `yarn docker:down`             | try the image locally with Postgres and the migrations (Docker Compose)   |

## Configuration

The BFF reads its settings from the environment when it starts
(`apps/bff/src/env.ts`). A missing or invalid value stops it with a list of
every problem. Nothing is baked in at build time, so one image serves any
customer and any domain.

| Variable                                               | Meaning                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`                                           | the address people use, https in production; used for the CSRF check, the canonical URL and the sitemap |
| `DATABASE_URL`                                         | Postgres                                                                                                |
| `TZ`                                                   | the time zone that decides "today", for end dates and expiry; required by the production compose file   |
| `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`  | optional: the identity provider and its confidential client. Unset, nobody signs in                     |
| `SESSION_SECRET`                                       | with `OIDC_*` only: signs the short-lived sign-in cookie (32+ random characters in production)          |
| `PORT`, `HOST`                                         | where the BFF listens (3000 and 0.0.0.0 in the image)                                                   |
| `LOG_LEVEL`                                            | `debug`, `info` (default), `warn`, `error` or `silent`                                                  |
| `STATIC_DIR`                                           | the built SPA (set in the image)                                                                        |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | the SMTP server mail goes through; unset, mail is only logged (see [Mail](#mail))                       |
| `MAIL_FROM`                                            | the sender, on a domain the SMTP server may send for                                                    |

## Authentication

The site is open: no page and no API route needs a session, as in the previous
version. Sign-in is optional and off unless `OIDC_ISSUER`, `OIDC_CLIENT_ID`,
`OIDC_CLIENT_SECRET` and `SESSION_SECRET` are set (setting one `OIDC_*`
without the others stops the server with an error); without them `/auth/*`
doesn't exist. It is kept so that restricting the site later is a matter of
configuration plus routes that check the session (the comment at the top of
`apps/bff/src/routes/api.ts` says how).

Any OpenID Connect provider works: Keycloak, Entra ID, Auth0, Google and
others. Create a **confidential** client with:

- the authorization code flow and PKCE (S256);
- the redirect URI `${PUBLIC_URL}/auth/callback`;
- the post-logout redirect URI `${PUBLIC_URL}/`;
- the scopes `openid email profile`.

The browser never sees a token or the client secret. After the callback, the
BFF stores a session row and sets an HttpOnly cookie, so deleting the row
signs that session out. Signing out also ends the provider's session. Users
are identified by issuer and subject. A user created ahead of their first
sign-in, by email and with no identity yet (as `yarn dev:session` does), is
linked to it when the provider has verified that email.

Who may sign in is decided by the provider: every account it accepts gets in.
Use the customer's own provider, or restrict a shared one to their users,
groups or domain. Never point `OIDC_ISSUER` at a public provider without such a
restriction.

## Mail

`mailer().send({ to, subject, text, html? })` (`apps/bff/src/mail.ts`) sends
through any SMTP server with Nodemailer, such as Scaleway Transactional Email:

```bash
SMTP_HOST=smtp.tem.scaleway.com
SMTP_PORT=465                       # TLS: 465, 2465. STARTTLS: 587, 2587, 25
SMTP_USER=<project id>
SMTP_PASSWORD=<API secret key>
MAIL_FROM="Acme <no-reply@acme.example>"   # on a domain verified in TEM
```

Credentials never travel unencrypted: ports other than 465 and 2465 must
upgrade with STARTTLS, or the mail isn't sent. A refused mail throws.

**No real mail in tests.** Without `SMTP_HOST`, nothing is sent: the mail is
logged (recipient and subject in development, a bare warning in production).
`vitest.config.ts` and `playwright.config.ts` both empty `SMTP_HOST`, which
wins over `.env` and the shell. In production a sent mail is logged by its
message id only, and a refusal by its SMTP codes, without the server's reply
(it often quotes the recipient). `yarn dev`
does send when `.env` has SMTP settings, so use addresses you own there.

Anything that sends mail because of a request must be rate limited with
`hit()` from `apps/bff/src/rate-limit.ts`.

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

## Customizing for a customer

- **Branding:** `packages/theme-platform-booking` holds the previous version's
  palette, dark by default with a light mode (the header's button, remembered
  in the browser; `apps/web/public/theme.js` applies it before the page
  renders). Components use only these tokens. The Inter and JetBrains Mono
  fonts are used when installed; they aren't downloaded, since the CSP allows
  nothing from other origins.
- **Pages:** replace a package's page in `apps/web/src/overrides.ts`. A route
  that doesn't exist is a type error. Add the customer's own routes in
  `apps/web/src/routes/`.
- **Features:** add a `packages/feature-*` package. It may depend on `core`,
  `api` and `ui` only (`scripts/check-boundaries.ts`).

## Tests

- **Unit and component tests** (`yarn test:unit`) live next to the code. Pure
  logic runs on Node. Components run in jsdom with Testing Library, and every
  request goes to MSW handlers from `@platform-booking/api/mocks`; an unhandled request
  fails the test.
- **End-to-end tests** (`yarn test`) build the app and run it with the bundled
  BFF on its own port and database, with the local Keycloak for the sign-in
  tests.
  Every test also fails on a browser console error, or on an axe accessibility
  violation (WCAG 2.2 AA) on the page it ends on. Tests that change data create
  their own platform (`e2e-…`) first. `e2e/auth.spec.ts` drives the real
  Keycloak login.

## Deploy

The previous version ran as one container on port 80 (or, with its compose
file, a `frontend` and a `backend` container), with its SQLite file at
`/app/data/booking.db` in a volume: `booking-data` with its README's
`docker run`, `<folder>_backend-data` with its compose file. `docker ps` and
`docker volume ls` show yours: use their names below. This one runs as three
services, `docker/compose.production.yaml`: Postgres, a migration step, and
the app, which also answers on port 80 (`APP_PORT`), so your HTTPS proxy
keeps pointing at the same port. The app speaks plain HTTP: keep it behind
that proxy, which must set `X-Forwarded-For`. `PUBLIC_URL` is the https
address people use, the old `CORS_ORIGINS` (the server refuses to start with
an http one in production).

First, on the server, in this repository, write the settings to
`docker/.env`. Compose reads it for every command run with
`-f docker/compose.production.yaml`, so later commands need nothing exported.
Git and image builds ignore it.

```bash
cat > docker/.env <<EOF
PUBLIC_URL=https://booking.example.com
POSTGRES_PASSWORD=$(openssl rand -hex 24)
TZ=Europe/Paris
EOF
chmod 600 docker/.env
```

`TZ` is the team's zone: whose "today" ends bookings. Keep the password
letters and digits, as `-hex` makes it: it goes into a URL, where a `/` or
`@` breaks it. Then replace the previous container. Run the steps one by one,
and go on only when one succeeds:

```bash
docker compose -f docker/compose.production.yaml build

# 1. The database, the migrations and the default platforms.
docker compose -f docker/compose.production.yaml run --rm migrate

# 2. Stop the previous container (both, with its compose file), so nothing
#    changes during the copy, then import its data (platforms, active
#    bookings, history) from its volume.
docker stop <old container>
docker compose -f docker/compose.production.yaml run --rm \
  -v booking-data:/legacy:ro migrate yarn db:import-sqlite /legacy/booking.db

# 3. Start the app on port 80 in its place.
docker compose -f docker/compose.production.yaml up -d
docker compose -f docker/compose.production.yaml ps   # app: "healthy"
```

The import opens the old file read-only and prints what it copied, and what it
skipped and why (a row with an invalid date, a duplicate). It reads the
file's write-ahead log too, so the last bookings made before the stop are
there. Bookings of a platform that no longer exists go to the history as
released. It refuses to run when Postgres already holds bookings or history,
so it can't duplicate anything. When the old file has a platforms table (any
version that could edit platforms), its list replaces the default one;
otherwise the defaults stay. A platform id the new site can't use in a URL
(with a slash or a space) is skipped, and its bookings go to the history; so
is an active booking whose trigram isn't three letters.

Keep the stopped old container and its volume until you've checked the new
site: never `docker compose down -v` in the old version's folder, which
deletes the volume. To go back, `docker compose -f
docker/compose.production.yaml stop app` and `docker start <old container>`:
the old data is as it was at the stop, and changes made on the new site since
are not in it. Once you're sure, `docker rm` the old container, and remove
its volume when you no longer want it as a backup.

Later deploys are `git pull` and
`docker compose -f docker/compose.production.yaml up -d --build`: the
`migrate` service applies new migrations before the app starts, and adds the
default platforms only to an empty table.

`yarn docker:build` builds the app image alone, and its `migrate` stage
(`--target migrate`) is the migration step.

The runtime image holds Node, a single bundled `server.js` and the static
files: no `node_modules`, no package manager, and it runs as a non-root user.
Its base image is pinned by digest, and Renovate updates it. The image has a
`HEALTHCHECK` on `GET /api/health` (503 when the database is unreachable), and
on `SIGTERM` the server finishes the requests in progress before it exits.

To try the image locally, `yarn docker:up` runs `docker/compose.yaml`:
Postgres, the migrations and the app at http://localhost:8080. Its password is
public: it isn't a deployment.

### Logs

The BFF writes one line per event to stdout, and warnings and errors to
stderr: JSON in the image, readable text in development. Each request is one
line with its method, path (never the query string), status and duration,
except health checks that succeed. Its id is returned as `x-request-id` and
added to everything logged while handling it; a proxy that sends
`x-request-id` keeps its own id. Errors are logged with their message, code
and stack only: query parameters and whatever a library attached to them are
dropped. Log with `log` from `apps/bff/src/log.ts`; lint refuses `console`.

CI builds the image on `main` and on tags and pushes it to the GitHub container
registry, with an SBOM and build provenance, and signs release tags with
cosign. See `SECURITY.md`. Nothing deploys it: running it is up to you.

## SEO

The app renders in the browser. Every URL first returns `apps/web/index.html`,
and the BFF fills in `PUBLIC_URL` when it serves it. That file carries the home
page's title, description, canonical URL, Open Graph tags and JSON-LD.
`robots.txt` and `sitemap.xml` are built from `PUBLIC_URL`. The pages listed in
`PUBLIC_PATHS` (`packages/core/src/site.ts`) appear in the sitemap. App pages
add `noindex` when they render. A public page that has to rank on its own
content needs prerendering (see `docs/decisions.md`).

## Security

- The site is open by design (see [Authentication](#authentication)): anyone
  who can reach it can book, change and delete. Keep it on the network it was
  on before.
- Sign-in, when configured, uses OIDC with PKCE through a confidential client. Sessions are
  server-side, the cookie is HttpOnly and SameSite=Lax (`__Host-` on https),
  and only a hash of the session token is stored.
- The CSP allows scripts from `'self'` only, with no `'unsafe-inline'`. The
  other headers are HSTS, `X-Frame-Options: DENY`, `nosniff` and a strict
  referrer policy (`apps/bff/src/app.ts`). Add third-party origins there.
- The CSRF check refuses cross-site form posts. There is no CORS, so other
  origins can't send JSON.
- Sign-ins, when configured, are rate limited per client address (`apps/bff/src/rate-limit.ts`).
- Supply chain: install scripts are disabled, versions younger than 7 days are
  refused, CI installs from the lockfile only, and Renovate waits 7 days too.

## Working with AI agents

`AGENTS.md` is the guide for every agent, with a short `AGENTS.md` per package.
`CLAUDE.md` adds Claude Code's skills, reviewer subagent and hooks. Strict
types, the generated API client, the boundary check and tests that run in
seconds are the guardrails. `yarn verify` is what an agent runs after each step.
