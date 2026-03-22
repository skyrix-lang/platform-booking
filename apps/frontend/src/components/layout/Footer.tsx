import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-surface-400 dark:text-surface-500">
        Platform Booking &copy; {new Date().getFullYear()} -{" "}
        <Link
          to="/platforms"
          className="hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
        >
          Edit platforms
        </Link>
      </div>
    </footer>
  );
}
