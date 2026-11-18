import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage } from "@platform-booking/feature-platforms";
import { pageFor } from "../overrides";
import { usePageMeta } from "../page-meta";

// An app page, open to everyone like the rest of the site: no sign-in.
const Page = pageFor("/bookings", BookingsPage);

export const Route = createFileRoute("/bookings")({
  component: function BookingsRoute() {
    usePageMeta({ title: "Bookings", noindex: true });
    return <Page />;
  },
});
