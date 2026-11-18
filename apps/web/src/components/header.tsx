import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { site } from "@platform-booking/core";
import { cn } from "@platform-booking/ui";
import { useTheme } from "../theme";

const navLinks = [
  { label: "Dashboard", to: "/" },
  { label: "Bookings", to: "/bookings" },
] as const;

const linkClass = (block = false) =>
  cn(
    block ? "block px-3 py-2" : "px-3 py-1.5",
    "rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary",
  );
// Link sets aria-current="page" on the active one; this styles it.
const activeClass = "bg-muted text-foreground hover:bg-muted";

const iconButton =
  "cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const themeLabel = theme === "dark" ? "Light mode" : "Dark mode";

  // Desktop and mobile navigation are switched with CSS breakpoints, never by
  // reading the screen size in render.
  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 rounded-md">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
            >
              P
            </span>
            <span className="text-sm font-semibold">{site.name}</span>
          </Link>

          <div className="flex items-center gap-1">
            <nav
              aria-label="Main"
              className="mr-3 hidden items-center gap-0.5 md:flex"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  activeOptions={{ exact: true, includeSearch: false }}
                  className={linkClass()}
                  activeProps={{ className: activeClass }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={themeLabel}
              title={themeLabel}
              className={iconButton}
            >
              {theme === "dark" ? (
                <Sun aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Moon aria-hidden="true" className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className={cn(iconButton, "md:hidden")}
            >
              {mobileMenuOpen ? (
                <X aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Menu aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav aria-label="Main" className="border-t bg-card px-4 py-2 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeOptions={{ exact: true, includeSearch: false }}
              onClick={() => setMobileMenuOpen(false)}
              className={linkClass(true)}
              activeProps={{ className: activeClass }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
