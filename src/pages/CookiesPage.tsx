import React from "react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const CookiesPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const cookieTypes = [
    {
      name: "Essential Cookies",
      description: "Required for the website to function properly",
      examples: "Session ID, authentication tokens",
    },
    {
      name: "Performance Cookies",
      description: "Help us understand how you use our website",
      examples: "Page views, user interactions",
    },
    {
      name: "Marketing Cookies",
      description: "Used to deliver personalized content",
      examples: "User preferences, marketing analytics",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-4xl mx-auto px-6 py-20">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
            Cookie Policy
          </h1>
          
          <div className="text-neutral-400 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">What Are Cookies?</h2>
              <p>
                Cookies are small text files that are placed on your device when you visit our website. They help us provide you with a better experience by remembering your preferences.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Types of Cookies We Use</h2>
              <div className="space-y-6 mt-4">
                {cookieTypes.map((cookie, idx) => (
                  <div key={idx} className="p-6 rounded-xl border border-white/10 bg-white/5">
                    <h3 className="text-lg font-bold text-emerald-400 mb-2">{cookie.name}</h3>
                    <p className="mb-2">{cookie.description}</p>
                    <p className="text-sm text-neutral-500">Examples: {cookie.examples}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Your Cookie Choices</h2>
              <p>
                Most web browsers allow you to control cookies. You can set your browser to:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Notify you before accepting cookies</li>
                <li>Accept or reject cookies from all websites</li>
                <li>Accept only cookies from trusted websites</li>
                <li>Delete cookies when you close your browser</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Third-Party Cookies</h2>
              <p>
                We work with analytics and advertising partners who may place cookies on your device. These partners include:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Google Analytics</li>
                <li>Mixpanel</li>
                <li>Facebook Pixel</li>
                <li>Other web analytics services</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">Contact Us</h2>
              <p>
                If you have questions about our cookie policy, please contact us at: privacy@curfd-ai.com
              </p>
            </div>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default CookiesPage;
