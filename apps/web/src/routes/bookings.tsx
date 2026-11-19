import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BookingsPage } from "@platform-booking/feature-platforms";
import { pageFor } from "../overrides";
import { usePageMeta } from "../page-meta";

// An app page, open to everyone like the rest of the site: no sign-in.
const Page = pageFor("/bookings", BookingsPage);

export const Route = createFileRoute("/bookings")({
  component: function BookingsRoute() {
    const { t } = useTranslation();
    usePageMeta({ title: t("bookings.title"), noindex: true });
    return <Page />;
  },
});
