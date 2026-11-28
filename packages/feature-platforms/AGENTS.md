# packages/feature-platforms

The platform booking screens, migrated from the previous version with the same
content and behaviour: the dashboard (platform cards, search and filters, book,
join, change the end date, release), the bookings page (active bookings and
the last three weeks of history) and the platforms page (add, edit, delete).

- Depends only on `@platform-booking/core`, `@platform-booking/api` and
  `@platform-booking/ui`. Data through the generated hooks; the app's routes
  pass URL state (the dashboard's filters) as props.
- `useLiveUpdates()` listens to `/api/events` and invalidates the queries it
  names; the app calls it once, in its layout. It's the one place that talks
  to the server outside the generated client: an event stream isn't JSON.
  It connects once the page's `load` event has passed: in WebKit an open
  stream holds that event back.
- The data is shared by everyone: there is no sign-in and no owner.
- Theme tokens only. Animations are CSS (`motion-safe:`), never a library.
- Tests next to the components, with MSW handlers from
  `@platform-booking/api/mocks`.
