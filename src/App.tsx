import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { SwipeBack } from "@/components/SwipeBack";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { DeviceGate } from "@/components/DeviceGate";
import { PageSkeleton } from "@/components/PageSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDeviceRole } from "@/contexts/DeviceContext";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const POS = lazy(() => import("@/pages/POS"));
const History = lazy(() => import("@/pages/History"));
const Cash = lazy(() => import("@/pages/Cash"));
const ShiftClose = lazy(() => import("@/pages/ShiftClose"));
const Admin = lazy(() => import("@/pages/Admin"));
const AdminPricing = lazy(() => import("@/pages/AdminPricing"));
const AdminEmployees = lazy(() => import("@/pages/AdminEmployees"));
const KnowledgeBase = lazy(() => import("@/pages/KnowledgeBase"));
const AdminSettings = lazy(() => import("@/pages/AdminSettings"));
const AdminDevices = lazy(() => import("@/pages/AdminDevices"));
const OwnerSurvey = lazy(() => import("@/pages/OwnerSurvey"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function AdminGuard({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isAdmin } = useDeviceRole();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <>
      <SwipeBack />
      <ServiceWorkerRegistration />
      <ErrorBoundary>
        <DeviceGate>
          <div className="page-transition">
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/history" element={<History />} />
                <Route path="/cash" element={<Cash />} />
                <Route path="/shift-close" element={<ShiftClose />} />
                <Route path="/help" element={<KnowledgeBase />} />
                <Route
                  path="/admin"
                  element={
                    <AdminGuard>
                      <Admin />
                    </AdminGuard>
                  }
                />
                <Route
                  path="/admin/pricing"
                  element={
                    <AdminGuard>
                      <AdminPricing />
                    </AdminGuard>
                  }
                />
                <Route
                  path="/admin/employees"
                  element={
                    <AdminGuard>
                      <AdminEmployees />
                    </AdminGuard>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <AdminGuard>
                      <AdminSettings />
                    </AdminGuard>
                  }
                />
                <Route
                  path="/admin/devices"
                  element={
                    <AdminGuard>
                      <AdminDevices />
                    </AdminGuard>
                  }
                />
                <Route
                  path="/admin/survey"
                  element={
                    <AdminGuard>
                      <OwnerSurvey />
                    </AdminGuard>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </DeviceGate>
      </ErrorBoundary>
    </>
  );
}
