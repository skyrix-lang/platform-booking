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

## Quick start

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

`yarn verify` checks
everything in seconds (format, types, lint, boundaries, API contract, unit
tests); `yarn test` runs the end-to-end tests. Every command:
[docs/development.md](docs/development.md#scripts).

## Documentation

| Guide                                                       | What's in it                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Architecture](docs/architecture.md)                        | the folders and packages, the JSON API                                    |
| [Development](docs/development.md)                          | running it locally, every command, the tests                              |
| [Configuration](docs/configuration.md)                      | the server's variables, sign-in (OpenID Connect), mail                    |
| [Customizing for a customer](docs/customizing.md)           | brand and dark mode, languages, icons, pages, features                    |
| [SEO, analytics and compression](docs/seo-and-analytics.md) | metadata, sitemap, 404s, link previews, Google Analytics, gzip and brotli |
| [Security](docs/security.md)                                | sessions, headers and CSP, CSRF, rate limits, supply chain                |
| [Deployment](docs/deployment.md)                            | the Docker image, deploying, rollback, backups, logs                      |
| [New project](docs/new-project.md)                          | from a clone to a GitHub repository with CI and auto-merge                |
| [Automatic deploys](docs/auto-deploy.md)                    | deploying `main` every night, backup first                                |
| [Starter sync](docs/starter-sync.md)                        | keeping a project up to date with the starter                             |
| [Decisions](docs/decisions.md)                              | what was decided, and why                                                 |

## This project

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

## Deploy

This version runs as three services, `docker/compose.production.yaml`:
Postgres, a migration step, and the app. The app answers on port 80, as
before, so your HTTPS proxy keeps pointing at the same place. The app
speaks plain HTTP: keep it behind that proxy, which must set
`X-Forwarded-For`.

### Settings: `docker/.env`

On the server, in this repository:

```bash
cp docker/.env.example docker/.env
chmod 600 docker/.env
openssl rand -hex 24   # paste it as POSTGRES_PASSWORD
```

Then fill in `docker/.env`. It needs only three values:

| Setting             | What to put                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------- |
| `PUBLIC_URL`        | the https address people type, such as `https://booking.example.com`                                      |
| `POSTGRES_PASSWORD` | a new password, letters and digits only (the `openssl` output). Keep it: the database keeps the first one |
| `TZ`                | the team's time zone, such as `Europe/Paris`: a booking ends at midnight there                            |

Compared with the previous version's `.env`:

| Before                                 | Now                                                   |
| -------------------------------------- | ----------------------------------------------------- |
| `CORS_ORIGINS`                         | `PUBLIC_URL`                                          |
| `FRONTEND_PORT=80`                     | `APP_PORT`, 80 by default: leave it out               |
| `DB_PATH`                              | gone: the data moves to Postgres, `POSTGRES_PASSWORD` |
| `VITE_API_URL`, `BACKEND_PORT`, `HOST` | gone: one container serves the site and the API       |
| (none)                                 | `TZ`                                                  |

Nothing else: sign-in stays off, as before. Compose reads `docker/.env` for
every `docker compose -f docker/compose.production.yaml` command; git and
image builds ignore it.

### Replace the previous container

Find the old container and its data volume: `docker ps` and
`docker volume ls`. With the old README's `docker run`, the volume is
`booking-data`; with its compose file, there are two containers (`frontend`
and `backend`) and the volume is `<folder>_backend-data`. Replace
`<old container>` and `booking-data` below with yours.

Run the steps one by one, and go on only when one succeeds:

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

### Going back

Keep the stopped old container and its volume until you've checked the new
site: never `docker compose down -v` in the old version's folder, which
deletes the volume. To go back, `docker compose -f
docker/compose.production.yaml stop app` and `docker start <old container>`:
the old data is as it was at the stop, and changes made on the new site since
are not in it. Once you're sure, `docker rm` the old container, and remove
its volume when you no longer want it as a backup.

### Later deploys

`git pull`, then
`docker compose -f docker/compose.production.yaml up -d --build`: the
`migrate` service applies new migrations before the app starts, and adds the
default platforms only to an empty table.

### The image

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

### Deploying automatically

> **Not wired up in this project yet.** The deploy scripts and the nightly
> workflow come from the starter and expect an
> [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) setup with a shared
> Postgres on its `nginx-proxy` network. This project's
> `docker/compose.production.yaml` is the self-contained stack described in
> [Deploy](#deploy) (its own Postgres, port 80), so `yarn deploy` and the
> nightly workflow won't work with it as is. Adapting them is a decision to
> take before setting `DEPLOY_SSH`. Guides: [docs/deployment.md](docs/deployment.md),
> [docs/auto-deploy.md](docs/auto-deploy.md).

## Keeping up to date with the starter

The project was created with `yarn rename platform-booking "Platform Booking"`
from [project-starter](https://github.com/skyrix-lang/project-starter);
`.starter.json` records the starter commit it started from. Renovate keeps
versions current and a workflow brings in the starter's changes as pull
requests (`yarn sync-from-starter` by hand): see
[docs/starter-sync.md](docs/starter-sync.md) and
[docs/new-project.md](docs/new-project.md).

## Working with AI agents

`AGENTS.md` is the guide for every agent, with a short `AGENTS.md` per package.
`CLAUDE.md` adds Claude Code's skills, reviewer subagent and hooks. Strict
types, the generated API client, the boundary check and tests that run in
seconds are the guardrails. `yarn verify` is what an agent runs after each step.
