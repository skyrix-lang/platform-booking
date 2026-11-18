# packages/feature-bookings

The bookings screens: list, filters, status changes, creation form. Depends only
on `@platform-booking/core`, `@platform-booking/api` and `@platform-booking/ui`. Data through generated
hooks; the app's route passes URL state (the status) as props. Tests next to
the components, with MSW handlers from `@platform-booking/api/mocks`.
