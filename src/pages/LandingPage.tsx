import { useState } from "react";
import AuthModal from "../components/auth/AuthModal";
import { Footer } from "../components/landing/Footer";
import { Hero } from "../components/landing/Hero";
import { Navbar } from "../components/landing/Navbar";
import { Pricing } from "../components/landing/Pricing";
import { ShowcaseGrid } from "../components/landing/ShowcaseGrid";

const LandingPage = () => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-800 selection:bg-primary-200/50">
      <Navbar onAuthClick={openAuth} />

      <main className="overflow-hidden">
        {/* HERO — Split layout: copy left, 3D preview right */}
        <Hero onAuthClick={openAuth} />

        {/* SHOWCASE — Sample models strip */}
        <section id="gallery">
          <ShowcaseGrid />
        </section>

        {/* FEATURES — Grid of capabilities */}
        <section id="features" className="py-24 px-6 bg-neutral-50 border-t border-neutral-100">
          <div className="max-w-6xl mx-auto text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-neutral-800">
              Everything you need to go from idea to print
            </h2>
            <p className="text-neutral-500 max-w-xl mx-auto">
              Chat-driven CAD generation, parametric editing, simulation, and direct printer handoff.
            </p>
          </div>
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
            {[
              { icon: "💬", title: "Chat to CAD", desc: "Describe a part in natural language. Get parametric OpenSCAD in seconds." },
              { icon: "🔧", title: "Parametric editing", desc: "Tweak dimensions, add features, iterate — all from the chat or code editor." },
              { icon: "🧊", title: "Image to 3D", desc: "Upload a photo or search for one. AI generates a mesh you can remix." },
              { icon: "📐", title: "Part segmentation", desc: "AI splits your model into named, printable components automatically." },
              { icon: "⚡", title: "Genetic optimization", desc: "Optimize parameters across generations for strength, weight, or fit." },
              { icon: "🖨️", title: "Print ready", desc: "Export watertight STL/GLB. Slice and send to your printer directly." },
            ].map((f) => (
              <div key={f.title} className="p-6 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="text-neutral-800 font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing">
          <Pricing onAuthClick={openAuth} />
        </section>

        {/* CTA */}
        <section className="py-24 px-6 bg-neutral-50 border-t border-neutral-100">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-semibold text-neutral-800">
              Ready to start building?
            </h2>
            <p className="text-neutral-500 max-w-lg mx-auto">
              Create an account and start generating 3D models in minutes. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
              <button
                onClick={() => openAuth("signup")}
                className="px-8 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 font-medium text-white transition-all shadow-sm"
              >
                Get started free
              </button>
              <a href="#features">
                <button className="px-8 py-3 rounded-full border border-neutral-300 hover:border-neutral-400 text-neutral-600 font-medium transition-colors">
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
