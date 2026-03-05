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
import logoSvg from "@/assets/logo.svg";

const navLinks: NavLinkType[] = [
  { label: "Dashboard", to: "/" },
  { label: "Bookings", to: "/bookings" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoSvg} alt="Logo" className="h-8 w-8" />
            <span className="text-lg font-bold text-surface-900 dark:text-white">
              Platform Booking
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {isDesktop && (
              <nav className="flex items-center gap-1 mr-2">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary-50 text-primary-700 dark:bg-primary-600/20 dark:text-primary-300"
                          : "text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-300 dark:hover:text-white dark:hover:bg-surface-800"
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
              className="p-2 rounded-md text-surface-500 hover:text-surface-700 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-800 cursor-pointer transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            {!isDesktop && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-surface-500 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800 cursor-pointer transition-colors"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isDesktop && mobileMenuOpen && (
        <nav className="border-t border-surface-200 dark:border-surface-700 px-4 py-2 bg-white dark:bg-surface-900 transition-colors">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-600/20 dark:text-primary-300"
                    : "text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-300 dark:hover:text-white dark:hover:bg-surface-800"
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
