import { Link } from "@tanstack/react-router";
import { site } from "@platform-booking/core";

// Read once when the app loads: a tab left open over New Year keeps the old year.
const year = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        {site.name} &copy; {year} -{" "}
        <Link
          to="/platforms"
          className="rounded-sm underline underline-offset-2 transition-colors hover:text-foreground"
        >
          Edit platforms
        </Link>
      </div>
    </footer>
  );
}
