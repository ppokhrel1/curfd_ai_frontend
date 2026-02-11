import { useAuthStore } from "@/lib/auth";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { FullPageLoader } from "@/components/common/Loader";
import ChatPage from "@/pages/ChatPage";
import HomePage from "@/pages/HomePage";
import LandingPage from "@/pages/LandingPage";
import SimulationPage from "@/pages/SimulationPage";
import ViewerPage from "@/pages/ViewerPage";
import FeaturesPage from "@/pages/FeaturesPage";
import PricingPage from "@/pages/PricingPage";
import DocumentationPage from "@/pages/DocumentationPage";
import APIPage from "@/pages/APIPage";
import AboutPage from "@/pages/AboutPage";
import BlogPage from "@/pages/BlogPage";
import CareersPage from "@/pages/CareersPage";
import ContactPage from "@/pages/ContactPage";
import TeamPage from "@/pages/TeamPage";
import TutorialsPage from "@/pages/TutorialsPage";
import ExamplesPage from "@/pages/ExamplesPage";
import CommunityPage from "@/pages/CommunityPage";
import SupportPage from "@/pages/SupportPage";
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import SecurityPage from "@/pages/SecurityPage";
import CookiesPage from "@/pages/CookiesPage";

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

        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/docs" element={<DocumentationPage />} />
        <Route path="/api" element={<APIPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/careers" element={<CareersPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/tutorials" element={<TutorialsPage />} />
        <Route path="/examples" element={<ExamplesPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/cookies" element={<CookiesPage />} />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/viewer"
          element={
            <ProtectedRoute>
              <ViewerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulation"
          element={
            <ProtectedRoute>
              <SimulationPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
