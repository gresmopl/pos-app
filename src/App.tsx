import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router";
import { SwipeBack } from "@/components/SwipeBack";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const POS = lazy(() => import("@/pages/POS"));
const History = lazy(() => import("@/pages/History"));
const Cash = lazy(() => import("@/pages/Cash"));
const ShiftClose = lazy(() => import("@/pages/ShiftClose"));
const Admin = lazy(() => import("@/pages/Admin"));
const AdminPricing = lazy(() => import("@/pages/AdminPricing"));
const OwnerSurvey = lazy(() => import("@/pages/OwnerSurvey"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export function App() {
  return (
    <>
      <SwipeBack />
      <ServiceWorkerRegistration />
      <ErrorBoundary>
        <div className="page-transition">
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/history" element={<History />} />
              <Route path="/cash" element={<Cash />} />
              <Route path="/shift-close" element={<ShiftClose />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/pricing" element={<AdminPricing />} />
              <Route path="/admin/survey" element={<OwnerSurvey />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </ErrorBoundary>
    </>
  );
}
