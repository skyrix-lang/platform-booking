import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";
import {
  AVAILABILITIES,
  DashboardPage,
  PLATFORM_TYPES,
  type DashboardFilters,
} from "@platform-booking/feature-platforms";
import { pageFor } from "../overrides";
import { usePageMeta } from "../page-meta";

// The dashboard: every platform and who's on it. Open to everyone, like the
// rest of the site (no sign-in). index.html carries its title, description and
// canonical URL. The search and filters live in the URL, so a filtered view
// can be shared; an unknown value falls back to showing everything.
const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  type: z.enum(PLATFORM_TYPES).optional().catch(undefined),
  show: z.enum(AVAILABILITIES).optional().catch(undefined),
});

const Page = pageFor("/", DashboardPage);

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: function DashboardRoute() {
    usePageMeta({});
    const filters = Route.useSearch();
    const navigate = Route.useNavigate();
    const onFiltersChange = useCallback(
      (search: DashboardFilters) => void navigate({ search, replace: true }),
      [navigate],
    );
    return <Page filters={filters} onFiltersChange={onFiltersChange} />;
  },
});
