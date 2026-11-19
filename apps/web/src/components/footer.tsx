import { Link } from "@tanstack/react-router";
import { site } from "@platform-booking/core";
import { openConsentSettings, useConsent } from "../analytics";
import { CONSENT_SETTINGS_ID } from "./consent-banner";

// Read once when the app loads: a tab left open over New Year keeps the old year.
const year = new Date().getFullYear();

export function Footer() {
  const { enabled } = useConsent();
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
        {/* Only when there is analytics to consent to. */}
        {enabled && (
          <>
            {" - "}
            <button
              type="button"
              id={CONSENT_SETTINGS_ID}
              onClick={openConsentSettings}
              className="cursor-pointer rounded-sm underline underline-offset-2 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cookie settings
            </button>
          </>
        )}
      </div>
    </footer>
  );
}
