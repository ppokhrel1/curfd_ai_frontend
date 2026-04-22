import { useAuthStore } from "@/lib/auth";
import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { FullPageLoader } from "@/components/common/Loader";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import PricingPage from "@/pages/PricingPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/JobsPage";
import AssetsPage from "./pages/AssetsPage";
import AssetDetailPage from "./pages/AssetDetailPage";

const PrintersPage = lazy(() => import("./pages/PrintersPage"));

const AutoRoute = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <FullPageLoader />;

  return <Navigate to={isAuthenticated ? "/dashboard" : "/landing"} replace />;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/landing" replace />;

  return <>{children}</>;
};

function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#1a1a1a',
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#e09820',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
            loading: {
              iconTheme: {
                primary: '#3b82f6',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<AutoRoute />} />

          <Route path="/landing" element={<LandingPage />} />
          <Route path="/signin" element={<AuthPage mode="signin" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <JobsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <AssetsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assets/:id"
            element={
              <ProtectedRoute>
                <AssetDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/printers"
            element={
              <ProtectedRoute>
                <Suspense fallback={<FullPageLoader />}>
                  <PrintersPage />
                </Suspense>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
