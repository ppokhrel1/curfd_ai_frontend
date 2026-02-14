import { useAuthStore } from "@/lib/auth";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { FullPageLoader } from "@/components/common/Loader";
import LandingPage from "@/pages/LandingPage";
import HomePage from "./pages/HomePage";

const AutoRoute = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <FullPageLoader />;

  return <Navigate to={isAuthenticated ? "/home" : "/landing"} replace />;
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
              background: '#171717',
              color: '#fff',
              border: '1px solid #262626',
              borderRadius: '12px',
              padding: '12px 16px',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
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

          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
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
