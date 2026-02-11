import React from "react";
import { Zap, Users, Target, Award } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const AboutPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const values = [
    {
      icon: Zap,
      title: "Innovation",
      description: "Pushing the boundaries of CFD simulation with AI",
    },
    {
      icon: Users,
      title: "Collaboration",
      description: "Working together to solve complex engineering challenges",
    },
    {
      icon: Target,
      title: "Excellence",
      description: "Delivering the highest quality simulations and support",
    },
    {
      icon: Award,
      title: "Reliability",
      description: "Enterprise-grade stability and performance you can trust",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              About NOORIAT
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl">
              We're revolutionizing computational fluid dynamics with artificial intelligence, making advanced simulation accessible to engineers worldwide.
            </p>
          </div>

          <div className="mb-16 p-8 rounded-xl border border-white/10 bg-white/5">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-neutral-400 text-lg leading-relaxed">
              To democratize CFD simulation and aerodynamic analysis through AI-powered tools, enabling engineers to design faster, better, and smarter products.
            </p>
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, idx) => {
                const Icon = value.icon;
                return (
                  <div key={idx} className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                    <Icon className="w-10 h-10 text-emerald-400 mb-4" />
                    <h3 className="text-lg font-bold mb-2">{value.title}</h3>
                    <p className="text-neutral-400 text-sm">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl border border-white/10 bg-white/5 text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">5K+</div>
              <p className="text-neutral-400">Active Users Worldwide</p>
            </div>
            <div className="p-8 rounded-xl border border-white/10 bg-white/5 text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">10K+</div>
              <p className="text-neutral-400">Simulations Completed</p>
            </div>
            <div className="p-8 rounded-xl border border-white/10 bg-white/5 text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">99.9%</div>
              <p className="text-neutral-400">Accuracy Rate</p>
            </div>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default AboutPage;
