import React from "react";
import { Zap, Cpu, Zap as Lightning, BarChart3, Lock, Zap as Zap2 } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const FeaturesPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const features = [
    {
      icon: Lightning,
      title: "AI-Powered Simulation",
      description: "Advanced machine learning algorithms accelerate CFD computations by 10x",
    },
    {
      icon: Cpu,
      title: "Real-Time Visualization",
      description: "Interactive 3D visualization with instant rendering of simulation results",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Deep insights into aerodynamic performance with comprehensive metrics",
    },
    {
      icon: Lock,
      title: "Enterprise Security",
      description: "Bank-level encryption and compliance with industry standards",
    },
    {
      icon: Zap,
      title: "Automated Optimization",
      description: "AI automatically suggests design improvements for better performance",
    },
    {
      icon: Zap2,
      title: "Cloud Infrastructure",
      description: "Scalable cloud computing for unlimited simulation capacity",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Powerful Features
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Everything you need to revolutionize your CFD workflow with AI-powered simulation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all duration-300 group"
                >
                  <Icon className="w-12 h-12 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-neutral-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default FeaturesPage;
