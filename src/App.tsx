import { Routes, Route } from "react-router";
import { SwipeBack } from "@/components/SwipeBack";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import Dashboard from "@/pages/Dashboard";
import POS from "@/pages/POS";
import History from "@/pages/History";
import Cash from "@/pages/Cash";
import ShiftClose from "@/pages/ShiftClose";
import Admin from "@/pages/Admin";
import AdminPricing from "@/pages/AdminPricing";

export function App() {
  return (
    <>
      <SwipeBack />
      <ServiceWorkerRegistration />
      <div className="page-transition">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/history" element={<History />} />
          <Route path="/cash" element={<Cash />} />
          <Route path="/shift-close" element={<ShiftClose />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/pricing" element={<AdminPricing />} />
        </Routes>
      </div>
    </>
  );
}
