import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout.tsx";
import { Home } from "@/pages/Home.tsx";
import { Booking } from "@/pages/Booking.tsx";

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="bookings" element={<Booking />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
