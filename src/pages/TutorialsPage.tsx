import React from "react";
import { PlayCircle, BookOpen, Code } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const TutorialsPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const tutorials = [
    {
      icon: PlayCircle,
      title: "Getting Started with CURFD AI",
      duration: "15 min",
      level: "Beginner",
      description: "Learn the basics of creating your first simulation",
    },
    {
      icon: Code,
      title: "Advanced Mesh Generation",
      duration: "45 min",
      level: "Advanced",
      description: "Master mesh optimization for better results",
    },
    {
      icon: BookOpen,
      title: "Aerodynamic Analysis Fundamentals",
      duration: "30 min",
      level: "Intermediate",
      description: "Understand how to interpret simulation results",
    },
    {
      icon: PlayCircle,
      title: "Using the AI Optimization Feature",
      duration: "25 min",
      level: "Intermediate",
      description: "Leverage AI to automatically improve your designs",
    },
    {
      icon: Code,
      title: "API Integration Guide",
      duration: "60 min",
      level: "Advanced",
      description: "Integrate CURFD AI with your workflow",
    },
    {
      icon: BookOpen,
      title: "Real-World Case Studies",
      duration: "40 min",
      level: "Intermediate",
      description: "Learn from successful customer implementations",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Tutorials
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Step-by-step guides to master CURFD AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tutorial, idx) => {
              const Icon = tutorial.icon;
              const levelColor = 
                tutorial.level === "Beginner" ? "text-green-400" :
                tutorial.level === "Intermediate" ? "text-yellow-400" :
                "text-red-400";
              
              return (
                <div key={idx} className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                  <Icon className="w-10 h-10 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-bold mb-2 group-hover:text-emerald-400 transition-colors">
                    {tutorial.title}
                  </h3>
                  <p className="text-neutral-400 text-sm mb-4">{tutorial.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">{tutorial.duration}</span>
                    <span className={`font-semibold ${levelColor}`}>{tutorial.level}</span>
                  </div>
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

export default TutorialsPage;
