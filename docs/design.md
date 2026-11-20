# Design

How this site looks and why: read it before building or changing a page. The
`design` skill (`.claude/skills/design/SKILL.md`) writes it with the person;
keep it in step with the theme and the pages. Rules, not history.

This is Platform Booking's look: the previous version's palette in
`packages/theme-platform-booking`. `yarn sync-from-starter` adds this file once
and never changes it after.

## Brief

- **For:** the team, booking test platforms by trigram, often for short tasks.
- **Visitors should:** see who is on which platform and book or release one.
- **Tone:** plain, dense, quick. Nothing decorative.

## Direction

Dark by default, an indigo primary for action, system fonts, a small radius
(`0.25rem`) and dense, scannable app screens. No public marketing pages.

## Tokens

All in `packages/theme-platform-booking/src/theme.css`; what each one does is in
`packages/theme-default/AGENTS.md`.

| Role   | Value                                         | Why                         |
| ------ | --------------------------------------------- | --------------------------- |
| Brand  | `--primary` indigo `#4f46e5` (dark `#818cf8`) | one colour for every action |
| Radius | `0.25rem`                                     | the previous version's look |

## Type

- `text-display`: the home hero only.
- `text-h1`: a public page's title. App screens and short pages (sign-in,
  errors) use `text-h2` for their `h1`.
- `text-h2`: section titles. `text-h3`: card and form titles.
- `text-lead`: the paragraph under a hero or page title, in `prose-width`.
- Body text is the default size; secondary text is `text-sm
  text-muted-foreground`.

## Sections and components

- **Hero:** centred `text-display`, `text-lead`, one primary button
  .
- **Card grid:** three columns from `md`, cards with an icon in a
  `bg-primary-soft` square, a `text-h3` title and a short text.
- **App screen:** title and actions in one row (stacked on phones), then the
  content (`packages/feature-platforms/src/dashboard-page.tsx`).
- Sections in a row: `pt-0` on the next one.
- Buttons: one primary call to action per section or form, the rest
  `secondary` or `ghost`. Actions repeated on every item of a list (a card's
  confirm button) may be primary at `size="sm"`.

## Imagery and icons

- Icons: Lucide, `aria-hidden` next to a text (an icon-only button has an
  `aria-label`). Sizes: `h-4 w-4` in a button with text, `h-5 w-5` in an
  icon-only button, `h-6 w-6` in a card, `h-12 w-12` for an empty state.
- No photos or illustrations in the default brand.

## Do and don't

- Do use the tokens and utilities for every colour, size and width.
- Do keep one primary call to action per section or form.
- Don't use a raw colour, a raw heading size or a fixed width.
- Don't add a second accent colour: use the soft variants (`primary-soft`,
  `success-soft`…) for emphasis.

## Pages

| Page         | Kind | Sections                                             |
| ------------ | ---- | ---------------------------------------------------- |
| `/`          | app  | dashboard: title, search and filters, platform cards |
| `/bookings`  | app  | app screen: title, calendar or list of bookings      |
| `/platforms` | app  | app screen: title, add platform, editable list       |
