# Platform booking (migration from the previous version)

Status: built

## Goal

The team keeps booking its test platforms exactly as before, on the starter's
stack: same pages, content, look and behaviour, one Docker image, Postgres
instead of SQLite, and the existing data carried over.

## Users and access

The team, on the internal network. Nobody signs in; all data is shared. A
person is identified by the three-letter trigram they type. Anyone can edit
the platform list. Sign-in exists but is off (see `docs/decisions.md`).

## Behaviour

- **Dashboard** (`/`): every platform as a card, Swarm first, then
  Kubernetes, sorted by id, with "x/y available". A card shows Available, Booked
  or "N users", the description, "Redeployed nightly" for nightly platforms,
  and each booking's trigram and end date with the days left ("(3d)",
  "(last day)").
  - Search matches a platform id or a trigram. Type (All, Swarm, K8S) and
    availability (All, Available, Booked) filters. All three live in the URL
    (`?q=&type=&show=`); an invalid value falls back to the default.
  - Book (free) or Join (booked) opens a dialog: trigram and an end date on a
    calendar from today. A nightly platform allows today only. A trigram
    already on the platform is refused before sending.
  - Each booking can have its end date changed (same dialog) or be released.
  - A refused action shows the server's message in a banner that can be
    dismissed; an action that fails for any other reason (a 500, the server
    unreachable) says so there too. A page whose data can't load shows the
    error page.
- **Bookings** (`/bookings`): active bookings, soonest end first, with
  edit-date and release; the history of the last three weeks, newest first,
  with Released or Expired. Empty states for both.
- **Platforms** (`/platforms`, from the footer's "Edit platforms"): a table of
  platforms; add (id, description, Kubernetes, Nightly), edit (the id is
  fixed), delete. Deleting a platform releases its bookings into the history.
- Every change appears on every open page within a moment, without reloading.
- Dark by default; the header switches to light, remembered per browser.
- A booking whose end date has passed is moved to the history as expired
  before anything reads the bookings.

## Data

New tables `platforms`, `bookings` (key: platform and trigram; deleting a
platform deletes its bookings, after moving them to the history) and
`booking_history`. The starter's demo `bookings` table and its enum are
dropped (migration `0001`): it only ever held demo rows. The default 20
platforms are seeded into an empty table. `yarn db:import-sqlite` copies the
previous version's SQLite file (platforms, bookings, history) once.

## Pages and API

`/` is public, as before (indexed, the one path in the sitemap); `/bookings`
and `/platforms` are app pages with `noindex`. API: see the API table in docs/architecture.md. Status codes: 400 bad
input or broken rule (end date in the past, nightly past today), 404 unknown
platform or booking, 409 duplicate platform id or trigram already on the
platform.

## Out of scope

Sign-in, per-person permissions, notifications, booking a future start date
(a booking always starts today, as before).

## Tests

- `e2e/dashboard.spec.ts`: books a free platform; checks the trigram; joins a
  booked platform, not twice with the same trigram; changes an end date;
  releases; a nightly platform only until today; filters kept in the URL;
  searches by who booked; shows other people's changes without reloading;
  failure banners.
- `e2e/bookings.spec.ts`, `e2e/platforms.spec.ts`: the other two pages.
- `e2e/api.spec.ts`: every route, its rules and its error statuses, expiry.
- `e2e/navigation.spec.ts`: header, theme (and axe in light mode), not found.
- Component tests in `packages/feature-platforms`, unit tests for the schemas,
  dates and the import mapping (`scripts/legacy-import.test.ts`).

## Open questions

None left. Answered: sign-in stays off; the old data is imported; deployment
is Docker Compose with Postgres behind the existing HTTPS proxy; icons are
lucide and animations CSS only.
