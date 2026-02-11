import React from "react";
import { Shapes, Zap, Globe, Rocket } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const ExamplesPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const examples = [
    {
      icon: Shapes,
      title: "Airfoil Optimization",
      description: "Design optimal wing profiles for aircraft",
      industry: "Aerospace",
    },
    {
      icon: Rocket,
      title: "Rocket Nozzle Design",
      description: "Analyze and optimize rocket engine nozzles",
      industry: "Space",
    },
    {
      icon: Zap,
      title: "Car Aerodynamics",
      description: "Reduce drag and improve efficiency",
      industry: "Automotive",
    },
    {
      icon: Globe,
      title: "Wind Turbine Blades",
      description: "Optimize renewable energy generation",
      industry: "Energy",
    },
    {
      icon: Shapes,
      title: "Heat Exchanger Design",
      description: "Improve thermal efficiency in systems",
      industry: "HVAC",
    },
    {
      icon: Zap,
      title: "Marine Hull Optimization",
      description: "Reduce resistance and fuel consumption",
      industry: "Maritime",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Examples & Use Cases
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Explore how CURFD AI is used across industries
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {examples.map((example, idx) => {
              const Icon = example.icon;
              return (
                <div key={idx} className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                  <Icon className="w-10 h-10 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-400 transition-colors">
                    {example.title}
                  </h3>
                  <p className="text-neutral-400 text-sm mb-4">{example.description}</p>
                  <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-emerald-400 border border-emerald-500 bg-emerald-500/20">
                    {example.industry}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-16 p-8 rounded-xl border border-white/10 bg-white/5">
            <h2 className="text-2xl font-bold mb-4">Want to see a specific example?</h2>
            <p className="text-neutral-400 mb-6">Contact our team to discuss your particular use case</p>
            <a href="/contact" className="inline-block px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-all">
              Get In Touch
            </a>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default ExamplesPage;
