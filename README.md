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

## Quick start

Requires Node 24 (`.nvmrc`), Corepack (`corepack enable`) and Docker.

```bash
yarn install
yarn setup        # .env, Postgres, Keycloak, database and migrations
yarn dev          # http://localhost:3000
```

`yarn setup` adds the default platforms; nobody needs to sign in. `yarn verify` checks everything in seconds (format, types, lint,
boundaries, API contract, unit tests); `yarn test` runs the end-to-end tests.
Every command: [docs/development.md](docs/development.md#scripts).

## Keeping up to date with the starter

Renovate updates versions, and a workflow brings in the starter's changes as
pull requests (`yarn sync-from-starter` does the same by hand), merged with
this project's own: [docs/starter-sync.md](docs/starter-sync.md).

## Documentation

| Guide                                                       | What's in it                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Architecture](docs/architecture.md)                        | the folders and packages, the JSON API                                    |
| [Development](docs/development.md)                          | running it locally, every command, the tests                              |
| [Configuration](docs/configuration.md)                      | the server's variables, sign-in (OpenID Connect), mail                    |
| [Customizing](docs/customizing.md)                          | brand and dark mode, languages, icons, pages, features                    |
| [SEO, analytics and compression](docs/seo-and-analytics.md) | metadata, sitemap, 404s, link previews, Google Analytics, gzip and brotli |
| [Security](docs/security.md)                                | sessions, headers and CSP, CSRF, rate limits, supply chain                |
| [Deployment](docs/deployment.md)                            | the Docker image, deploying, rollback, backups, logs                      |
| [New project](docs/new-project.md)                          | from a clone to a GitHub repository with CI and auto-merge                |
| [Automatic deploys](docs/auto-deploy.md)                    | deploying `main` every night, backup first                                |
| [Starter sync](docs/starter-sync.md)                        | keeping this project up to date with the starter                          |
| [Decisions](docs/decisions.md)                              | what was decided, and why                                                 |

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

## Working with AI agents

`AGENTS.md` is the guide for every agent, with a short `AGENTS.md` per package.
`CLAUDE.md` adds Claude Code's skills, reviewer subagent and hooks. Strict
types, the generated API client, the boundary check and tests that run in
seconds are the guardrails. `yarn verify` is what an agent runs after each step.
