import { useState } from "react";
import AuthModal from "../components/auth/AuthModal";
import { Footer } from "../components/landing/Footer";
import { Hero } from "../components/landing/Hero";
import { Navbar } from "../components/landing/Navbar";
import { Pricing } from "../components/landing/Pricing";
import PromptBox from "../components/landing/PromptBox";
import { ShowcaseGrid } from "../components/landing/ShowcaseGrid";

const LandingPage = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-emerald-500/30">
      <Navbar onAuthClick={openAuth} />

      <main className="overflow-hidden">
        {/* HERO SECTION */}
        <Hero onAuthClick={openAuth} />

        {/* DEMO SECTION */}
        <section className="relative py-24 px-6 bg-neutral-950">
          <div className="relative max-w-6xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Try it out
            </h2>

            <p className="text-neutral-400 max-w-xl mx-auto">
              Describe what you want to build and the AI will generate the geometry for you.
            </p>

            <div className="pt-4">
              <PromptBox onAuthClick={openAuth} />
            </div>
          </div>
        </section>

        {/* FEATURE GRID */}
        <ShowcaseGrid />

        {/* PRICING SECTION */}
        <Pricing onAuthClick={openAuth} />

        {/* CTA SECTION */}
        <section className="py-24 px-6 bg-neutral-950 border-t border-white/10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Ready to start building?
            </h2>

            <p className="text-neutral-400 max-w-lg mx-auto">
              Create an account and start generating 3D models in minutes. No credit card required.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
              <button
                onClick={() => openAuth("signup")}
                className="px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-black transition-colors"
              >
                Get started free
              </button>

              <a href="#features">
                <button className="px-8 py-3 rounded-xl border border-white/10 hover:border-white/20 text-white font-medium transition-colors">
                  See features
                </button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onSwitchMode={() =>
          setAuthMode(authMode === "signin" ? "signup" : "signin")
        }
      />
    </div>
  );
};

export default LandingPage;
