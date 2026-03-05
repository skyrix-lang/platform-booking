export function Footer() {
  return (
    <footer className="bg-white border-t border-surface-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-surface-500">
            &copy; {new Date().getFullYear()} BookingHub. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#"
              className="text-sm text-surface-500 hover:text-surface-700 transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-sm text-surface-500 hover:text-surface-700 transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
