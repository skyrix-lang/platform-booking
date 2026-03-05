import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header.tsx";
import { Footer } from "@/components/layout/Footer.tsx";

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
