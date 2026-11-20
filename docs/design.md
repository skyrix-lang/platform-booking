# Design

How this site looks and why: read it before building or changing a page. The
`design` skill (`.claude/skills/design/SKILL.md`) changes it with the person;
keep it in step with the theme and the pages. Rules, not history.

This records Platform Booking as it is: the previous version's look, carried
over into `packages/theme-platform-booking`. It was written from the theme
and the pages, not from a design brief.

## Brief

- **For:** the team that shares the test platforms. Each person books a
  platform under their trigram, with no sign-in, and sees the others' changes
  live.
- **Visitors should:** see at a glance which platforms are free, book one for
  a date range, and change or release their booking; less often, add or edit
  a platform.
- **Tone:** a working tool. Compact, quiet, status first: the colour of a card
  says free or booked before anything is read.

## Direction

A dark, dense dashboard: near-black surfaces, grey borders, one indigo for
actions and focus, green for free, amber for booked, red for ending or
destructive. Small type, monospace for codes (trigrams, dates, counts),
tight corners. Dark is the default; light is the same palette on grey-white.

## Tokens

All in `packages/theme-platform-booking/src/theme.css`; what each one does is
in `packages/theme-default/AGENTS.md`.

| Role     | Value                                                                       | Why                                                     |
| -------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| Brand    | `--primary` indigo `#4f46e5` (dark `#818cf8`), also `--ring`                | one colour for actions, the active link and focus       |
| Surfaces | `--background` `#f9fafb`, `--card` white (dark `#030712`, `#111827`)        | cards and the header stand out by colour and border     |
| Statuses | `--success` green (free), `--warning` amber (booked), `--destructive` red   | a platform's state is read from its colour              |
| Kinds    | `--info-soft` blue (Kubernetes), `--accent-soft` purple (nightly)           | the platform badges on the platforms screen             |
| Fonts    | Inter (`--font-sans`) for body and headings, JetBrains Mono (`--font-mono`) | used when installed; nothing is downloaded (CSP)        |
| Headings | weight 700, no extra tracking                                               | as the previous version's page titles                   |
| Radius   | `0.25rem`                                                                   | tight, tool-like corners                                |
| Layout   | content 80rem, text 65ch, sections 2rem                                     | the previous version's width and spacing; dense screens |

## Type

- App screens title themselves with `PageHeading`
  (`packages/feature-platforms/src/parts.tsx`): an `h1` in `text-lg
  font-semibold`, with a monospace count under it (`12/20 available`). It
  is smaller than the scale on purpose: the screen's content is the focus.
- Short pages (sign-in, errors, not found) use `text-h2` for their `h1`.
- Section titles inside a screen are small: `text-sm font-semibold
  text-secondary-foreground` (the dashboard's groups).
- Card titles are `h3` in `font-semibold` at body size (a platform's id in
  capitals).
- Codes, dates and counts are `font-mono`, usually `text-xs`; secondary text is
  `text-sm` or `text-xs text-muted-foreground`. Table heads are `text-xs`
  uppercase with wide tracking (`tableHeadClass`).
- `text-display`, `text-h1` and `text-lead` aren't used yet: the only public
  page is the dashboard.

## Sections and components

- **Layout:** a sticky header (`h-14`, a square "P" mark in `bg-primary`, the
  name, links to Dashboard and Bookings, language and theme switches; a menu
  on phones), the page, and a one-line footer with a link to edit the
  platforms. Each page is one `page-section` > `page-container`, and fades in
  (`motion-safe:animate-fade-in`).
- **App screen:** a `space-y-6` column: an error banner when an action failed,
  the `PageHeading`, filters, then the content.
- **Filters:** a search box and segmented controls (`Segmented`: a group of
  buttons in a `bg-muted` box) side by side from `sm`, stacked on phones. They
  live in the URL.
- **Platform card** (`platform-card.tsx`): a bordered card with a thin top bar
  in the status colour, a status badge, the platform's icon and id, and each
  booking's trigram, dates and days left, with ghost buttons to edit or
  release. Grid of 1, 2, 3 then 4 columns (`sm`, `lg`, `xl`), grouped as Swarm
  then Kubernetes platforms. Cards pop in (`animate-pop-in`).
- **Tables** (bookings, platforms): a bordered card holding a scrollable,
  focusable region; rows highlight on hover, actions are small ghost buttons
  on the right. An empty table shows an icon and a line of text instead.
- **Booking dialog:** a trigram field and a calendar for the release date,
  opened from a card or a row ("Book Platform", "Edit Release Date").
- **Platform form:** opens above the table ("Add Platform", or a row's edit
  button), in a bordered card that slides in.
- **Badges:** `Badge` with a tone (`success`, `warning`, `danger`) for time
  left and status; `info-soft` and `accent-soft` for platform kinds.
- **Feedback:** a toast for what just happened; an error banner in the page
  for what failed.
- Buttons: the primary one for the main action of a form or dialog
  ("Confirm", "Create", "Update"), and a free card's full-width "Book".
  Other actions on a card or row (edit, release, delete) are ghost and
  `size="sm"`.

## Imagery and icons

- Icons: Lucide, `aria-hidden` next to a text, an `aria-label` on icon-only
  buttons. `Box` and `Server` tell Swarm from Kubernetes platforms, `Moon`
  marks nightly ones; `CalendarDays`, `Clock` and `CircleUserRound` go with
  bookings. Sizes: `h-4 w-4` inline, `h-5 w-5` in an icon-only button.
- No photos or illustrations. The app icon and share image are in
  `apps/web/public/` (`icon.svg`, `og-image.png`).

## Do and don't

- Do use the tokens and utilities for every colour, size and width; status
  colours only for status.
- Do keep screens dense: small type, `gap-3` grids, `space-y-6` between blocks.
- Do show codes (trigrams, ids, dates) in `font-mono`.
- Don't use a raw colour, a raw heading size or a fixed page width.
- Don't add a new accent: the soft variants (`primary-soft`, `success-soft`,
  `info-soft`, `accent-soft`…) are for emphasis.
- Don't animate without `motion-safe:`.

## Pages

| Page         | Kind   | Sections                                                                                                          |
| ------------ | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `/`          | public | app screen: "Platforms" heading, search and filters, Swarm and Kubernetes card grids                              |
| `/bookings`  | app    | app screen: "Active Bookings" table (platform, trigram, dates, days left, actions), then "History" (last 3 weeks) |
| `/platforms` | app    | app screen: "Manage Platforms" heading and "Add Platform", the form when open, table of platforms                 |
| `/sign-in`   | app    | one narrow card: title, text, sign-in button (only when sign-in is on)                                            |
