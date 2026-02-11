import React from "react";
import { HelpCircle, Zap, AlertCircle, BookOpen } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const SupportPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const faqItems = [
    {
      question: "How long does a typical simulation take?",
      answer: "With AI acceleration, most simulations complete in seconds to minutes, depending on complexity.",
    },
    {
      question: "What file formats are supported?",
      answer: "We support STEP, IGES, STL, OBJ, and many other CAD formats.",
    },
    {
      question: "Can I use CURFD AI for production engineering?",
      answer: "Yes! Many companies use CURFD AI for production-level simulations with 99.9% accuracy.",
    },
    {
      question: "Is there a free tier available?",
      answer: "Yes, our Starter plan is free forever with 5 simulations per month.",
    },
  ];

  const supportOptions = [
    {
      icon: Zap,
      title: "Live Chat",
      description: "Get instant help from our support team",
      available: "24/7 for Enterprise",
    },
    {
      icon: HelpCircle,
      title: "Knowledge Base",
      description: "Browse hundreds of articles and guides",
      available: "Always available",
    },
    {
      icon: AlertCircle,
      title: "Status Page",
      description: "Check system status and incidents",
      available: "Always available",
    },
    {
      icon: BookOpen,
      title: "Email Support",
      description: "Detailed support@curfd-ai.com",
      available: "Response within 24h",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Support & Help
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              We're here to help you succeed with CURFD AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {supportOptions.map((option, idx) => {
              const Icon = option.icon;
              return (
                <div key={idx} className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                  <Icon className="w-10 h-10 text-emerald-400 mb-4" />
                  <h3 className="font-bold mb-2">{option.title}</h3>
                  <p className="text-neutral-400 text-sm mb-4">{option.description}</p>
                  <p className="text-xs text-emerald-400 font-semibold">{option.available}</p>
                </div>
              );
            })}
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqItems.map((item, idx) => (
                <div key={idx} className="p-6 rounded-xl border border-white/10 bg-white/5">
                  <h3 className="text-lg font-bold mb-2 text-emerald-400">{item.question}</h3>
                  <p className="text-neutral-400">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/50 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
            <p className="text-neutral-400 mb-6">Contact our support team or check our documentation</p>
            <div className="flex gap-4">
              <a href="mailto:support@curfd-ai.com" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-all">
                Email Support
              </a>
              <a href="/docs" className="px-6 py-3 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all font-semibold">
                View Docs
              </a>
            </div>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default SupportPage;
