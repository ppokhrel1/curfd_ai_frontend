import React from "react";
import { BookOpen, Code, Settings, Zap } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const DocumentationPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const docs = [
    {
      icon: BookOpen,
      title: "Getting Started",
      description: "Learn the basics and set up your first simulation in minutes",
      sections: ["Installation", "First Simulation", "Dashboard Overview"],
    },
    {
      icon: Code,
      title: "API Reference",
      description: "Complete API documentation for developers",
      sections: ["Authentication", "Endpoints", "Code Examples"],
    },
    {
      icon: Settings,
      title: "Configuration",
      description: "Customize your simulations and workflows",
      sections: ["Solver Settings", "Boundary Conditions", "Mesh Generation"],
    },
    {
      icon: Zap,
      title: "Advanced Topics",
      description: "Deep dive into advanced features and optimizations",
      sections: ["AI Optimization", "Machine Learning", "Performance Tuning"],
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Documentation
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Everything you need to master CURFD AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {docs.map((doc, idx) => {
              const Icon = doc.icon;
              return (
                <div key={idx} className="p-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                  <Icon className="w-10 h-10 text-emerald-400 mb-4" />
                  <h3 className="text-2xl font-bold mb-2">{doc.title}</h3>
                  <p className="text-neutral-400 mb-6">{doc.description}</p>
                  <ul className="space-y-2">
                    {doc.sections.map((section, sidx) => (
                      <li key={sidx} className="text-emerald-400 hover:text-emerald-300 cursor-pointer">
                        → {section}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Can't find what you're looking for?</h2>
            <p className="text-neutral-400 mb-4">Check our FAQ or contact our support team</p>
            <button className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition-all">
              Get Help
            </button>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default DocumentationPage;
