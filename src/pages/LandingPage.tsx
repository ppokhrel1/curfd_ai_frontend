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

        {/* HOW IT WORKS — The 4-stage parts → print pipeline */}
        <section id="how-it-works" className="py-24 px-6 bg-white border-t border-neutral-100">
          <div className="max-w-6xl mx-auto text-center space-y-4 mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold text-neutral-800">
              From idea to printed parts in four steps
            </h2>
            <p className="text-neutral-500 max-w-xl mx-auto">
              Most CAD tools stop at the mesh. We take you all the way to slicer-ready
              individual components — printed one piece at a time, the way prints
              actually fit on a build plate.
            </p>
          </div>
          <ol className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                step: "1",
                title: "Describe",
                desc: "Type a prompt or attach an image. Chat refines it as you iterate.",
              },
              {
                step: "2",
                title: "Generate",
                desc: "Pick a reference from web search, your upload, or AI-generated. Hunyuan3D turns it into a coloured mesh.",
              },
              {
                step: "3",
                title: "Decompose",
                desc: "P3-SAM splits the mesh into named printable parts — base, arm, shade — automatically.",
              },
              {
                step: "4",
                title: "Print",
                desc: "Download each part as a watertight STL/GLB. Drop into your slicer of choice and go.",
              },
            ].map((s, i, arr) => (
              <li key={s.step} className="relative">
                <div className="p-5 rounded-xl border border-neutral-200 bg-white hover:border-primary-300 hover:shadow-sm transition-all h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-500 text-white text-xs font-semibold">
                      {s.step}
                    </span>
                    <h3 className="text-neutral-800 font-semibold">{s.title}</h3>
                  </div>
                  <p className="text-sm text-neutral-500 leading-relaxed">{s.desc}</p>
                </div>
                {/* Connector arrow on lg+ screens, except after the last */}
                {i < arr.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 text-neutral-300 text-xl pointer-events-none select-none">
                    →
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* FEATURES — Grid of capabilities */}
        <section id="features" className="py-24 px-6 bg-neutral-50 border-t border-neutral-100">
          <div className="max-w-6xl mx-auto text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold text-neutral-800">
              Everything between sentence and print plate
            </h2>
            <p className="text-neutral-500 max-w-xl mx-auto">
              Chat, image-to-3D, AI image generation, automatic part-splitting,
              UV-mapped textures, and slicer-ready exports — all in one workspace.
            </p>
          </div>
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
            {[
              { icon: "💬", title: "Chat to CAD", desc: "Describe a part in plain English. Get parametric OpenSCAD or CadQuery in seconds." },
              { icon: "🖼️", title: "Image to 3D", desc: "Pick from search results, drop in your own image, or have AI generate the reference for you." },
              { icon: "✨", title: "AI image generation", desc: "Inside the picker: describe and refine a reference image with Gemini before turning it into a mesh." },
              { icon: "🧩", title: "Auto part-split", desc: "Every mesh is decomposed into named components — print each piece individually, not one giant blob." },
              { icon: "🎨", title: "Texture + colour", desc: "Optional UV-mapped textures so the printed parts look like the reference, not grey print-layer striations." },
              { icon: "🖨️", title: "Slicer-ready output", desc: "Watertight STL or GLB per part. Drop straight into Cura, PrusaSlicer, Bambu, or Anycubic." },
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
