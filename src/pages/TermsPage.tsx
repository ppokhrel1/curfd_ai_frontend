import React from "react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const TermsPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-4xl mx-auto px-6 py-20">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
            Terms of Service
          </h1>
          
          <div className="text-neutral-400 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using CURFD AI, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">2. Use License</h2>
              <p>
                Permission is granted to temporarily download one copy of the materials (information or software) on CURFD AI for personal, non-commercial transitory viewing only.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">3. Disclaimer</h2>
              <p>
                The materials on CURFD AI are provided and distributed "AS IS" without any warranty or condition of any kind, either express or implied.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">4. Limitations of Liability</h2>
              <p>
                In no event shall CURFD AI or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption).
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">5. Modifications</h2>
              <p>
                CURFD AI may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">6. Governing Law</h2>
              <p>
                These conditions and terms are governed by and construed in accordance with the laws of the United States and you irrevocably submit to the exclusive jurisdiction of the courts located in this location.
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

export default TermsPage;
