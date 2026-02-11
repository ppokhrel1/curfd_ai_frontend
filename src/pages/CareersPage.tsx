import React from "react";
import { Briefcase, Users, Zap, Award } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const CareersPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const positions = [
    {
      title: "Senior CFD Engineer",
      department: "Engineering",
      location: "Remote",
      type: "Full-time",
    },
    {
      title: "Machine Learning Engineer",
      department: "AI/ML",
      location: "Remote",
      type: "Full-time",
    },
    {
      title: "Full Stack Developer",
      department: "Product",
      location: "San Francisco, CA",
      type: "Full-time",
    },
    {
      title: "DevOps Engineer",
      department: "Infrastructure",
      location: "Remote",
      type: "Full-time",
    },
    {
      title: "Technical Sales Engineer",
      department: "Sales",
      location: "EMEA",
      type: "Full-time",
    },
    {
      title: "Documentation Specialist",
      department: "Content",
      location: "Remote",
      type: "Full-time",
    },
  ];

  const values = [
    { icon: Zap, title: "Innovation", desc: "Push boundaries with cutting-edge technology" },
    { icon: Users, title: "Collaboration", desc: "Work with world-class engineers" },
    { icon: Award, title: "Growth", desc: "Continuous learning and development" },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Join Our Team
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Help us revolutionize CFD simulation with AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {values.map((value, idx) => {
              const Icon = value.icon;
              return (
                <div key={idx} className="p-6 rounded-xl border border-white/10 bg-white/5 text-center">
                  <Icon className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">{value.title}</h3>
                  <p className="text-neutral-400">{value.desc}</p>
                </div>
              );
            })}
          </div>

          <h2 className="text-3xl font-bold mb-8">Open Positions</h2>
          <div className="space-y-4 mb-16">
            {positions.map((position, idx) => (
              <div key={idx} className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-between group">
                <div>
                  <h3 className="text-lg font-bold group-hover:text-emerald-400 transition-colors">{position.title}</h3>
                  <p className="text-neutral-400 text-sm mt-1">{position.department} • {position.location}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-emerald-400 border border-emerald-500 bg-emerald-500/20">
                  {position.type}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/50 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Don't see the right position?</h2>
            <p className="text-neutral-400 mb-6">Send us your resume and we'll keep you in mind for future opportunities</p>
            <a href="mailto:careers@curfd-ai.com" className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-all">
              Send Your Resume
            </a>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default CareersPage;
