import { createFileRoute } from "@tanstack/react-router";
import { PlatformsPage } from "@platform-booking/feature-platforms";
import { pageFor } from "../overrides";
import { usePageMeta } from "../page-meta";

// An app page, open to everyone like the rest of the site: no sign-in. Linked
// from the footer ("Edit platforms"), as in the previous version.
const Page = pageFor("/platforms", PlatformsPage);

export const Route = createFileRoute("/platforms")({
  component: function PlatformsRoute() {
    usePageMeta({ title: "Platforms", noindex: true });
    return <Page />;
  },
});
