import { Link, NavLink } from "react-router-dom";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery.ts";
import type { NavLink as NavLinkType } from "@/types/index.ts";
import logoSvg from "@/assets/logo.svg";

const navLinks: NavLinkType[] = [
  { label: "Home", to: "/" },
  { label: "Bookings", to: "/bookings" },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <header className="bg-white border-b border-surface-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoSvg} alt="Logo" className="h-8 w-8" />
            <span className="text-lg font-bold text-surface-900">
              BookingHub
            </span>
          </Link>

          {isDesktop ? (
            <nav className="flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary-50 text-primary-700"
                        : "text-surface-600 hover:text-surface-900 hover:bg-surface-100"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          ) : (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-surface-500 hover:bg-surface-100 cursor-pointer"
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

      {!isDesktop && mobileMenuOpen && (
        <nav className="border-t border-surface-200 px-4 py-2 bg-white">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-700"
                    : "text-surface-600 hover:text-surface-900 hover:bg-surface-100"
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
