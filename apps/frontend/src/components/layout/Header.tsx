import { Link, NavLink } from "react-router-dom";
import {
  Bars3Icon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery.ts";
import { useTheme } from "@/hooks/useTheme.ts";
import type { NavLink as NavLinkType } from "@/types/index.ts";

const navLinks: NavLinkType[] = [
  { label: "Dashboard", to: "/" },
  { label: "Bookings", to: "/bookings" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-sm flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              Platform Booking
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {isDesktop && (
              <nav className="flex items-center gap-0.5 mr-3">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      `px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-surface-100 text-surface-900 dark:bg-surface-800 dark:text-surface-100"
                          : "text-surface-600 hover:text-surface-900 hover:bg-surface-50 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-800"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-sm text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-800 cursor-pointer transition-colors"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
            </button>

            {!isDesktop && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-sm text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800 cursor-pointer transition-colors"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-5 w-5" />
                ) : (
                  <Bars3Icon className="h-5 w-5" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isDesktop && mobileMenuOpen && (
        <nav className="border-t border-surface-200 dark:border-surface-800 px-4 py-2 bg-white dark:bg-surface-900">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-sm text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-surface-100 text-surface-900 dark:bg-surface-800 dark:text-surface-100"
                    : "text-surface-600 hover:text-surface-900 hover:bg-surface-50 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-800"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
