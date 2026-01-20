import { useState } from "react";
import AuthModal from "../components/auth/AuthModal";
import { Footer } from "../components/landing/Footer";
import { Hero } from "../components/landing/Hero";
import { Navbar } from "../components/landing/Navbar";
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
        <section className="relative py-28 px-6 bg-neutral-950">
          {/* Background Gradients */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute w-96 h-96 bg-emerald-500/10 blur-3xl left-0 top-20" />
            <div className="absolute w-96 h-96 bg-green-500/10 blur-3xl right-0 bottom-20" />
          </div>

          <div className="relative max-w-6xl mx-auto text-center space-y-6">
            <span className="inline-block px-4 py-1.5 rounded-full text-sm border border-white/10 bg-white/5 text-neutral-400">
              ⚙️ Live AI Demo
            </span>

            <h2 className="text-4xl md:text-5xl font-extrabold leading-tight text-white">
              Describe It →{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
                AI Builds It.
              </span>
            </h2>

            <p className="text-neutral-400 max-w-2xl mx-auto">
              Enter any shape, model or robotic system — our AI generates it in
              seconds.
            </p>

            <div className="pt-6">
              <PromptBox />
            </div>
          </div>
        </section>

        {/* FEATURE GRID */}
        <ShowcaseGrid />

        {/* STATS SECTION */}
        <section className="py-24 border-t border-white/10 bg-neutral-950">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center px-6">
            {[
              { value: "10K+", label: "Shapes Generated" },
              { value: "99.9%", label: "Simulation Accuracy" },
              { value: "5K+", label: "Active Users" },
              { value: "<1s", label: "AI Response Time" },
            ].map((stat, i) => (
              <div key={i} className="space-y-2 group">
                <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent group-hover:scale-110 transition-transform">
                  {stat.value}
                </div>
                <p className="text-neutral-400 text-sm font-medium">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="relative py-28 px-6 overflow-hidden bg-neutral-950">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-green-500/10 to-teal-500/10" />

          <div className="relative max-w-5xl mx-auto text-center space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Build Faster. Build Smarter.{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                Build With AI.
              </span>
            </h2>

            <p className="text-neutral-400 text-lg max-w-xl mx-auto">
              Design → Simulate → Iterate — All inside one intelligent platform.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <button
                onClick={() => openAuth("signup")}
                className="px-10 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 hover:scale-105 font-semibold text-black shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300"
              >
                🚀 Start for Free
              </button>

              <a href="#docs">
                <button className="px-10 py-4 rounded-xl border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all duration-300">
                  📄 Documentation
                </button>
              </a>
            </div>

            <div className="flex justify-center gap-6 pt-8 text-neutral-500 text-sm flex-wrap">
              <p>▸ No credit card required</p>
              <p>▸ Free Forever Plan</p>
              <p>▸ Instant Setup</p>
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
