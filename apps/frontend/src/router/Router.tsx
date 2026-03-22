import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout.tsx";
import { Dashboard } from "@/pages/Dashboard.tsx";
import { Bookings } from "@/pages/Bookings.tsx";
import { Platforms } from "@/pages/Platforms.tsx";

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="platforms" element={<Platforms />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
