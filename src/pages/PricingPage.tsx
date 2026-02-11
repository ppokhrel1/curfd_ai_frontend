import React from "react";
import { Check } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const PricingPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const plans = [
    {
      name: "Starter",
      price: "Free",
      description: "Perfect for getting started",
      features: [
        "5 simulations/month",
        "Basic visualization",
        "Community support",
        "2GB cloud storage",
      ],
    },
    {
      name: "Professional",
      price: "$49",
      period: "/month",
      description: "For growing teams",
      featured: true,
      features: [
        "Unlimited simulations",
        "Advanced visualization",
        "Priority support",
        "100GB cloud storage",
        "AI optimization",
        "Export capabilities",
      ],
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large organizations",
      features: [
        "Unlimited everything",
        "Dedicated support",
        "Custom training",
        "Enterprise SLA",
        "API access",
        "White-label options",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Choose the plan that fits your needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`p-8 rounded-xl border transition-all duration-300 ${
                  plan.featured
                    ? "border-emerald-500 bg-emerald-500/10 md:scale-105"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {plan.featured && (
                  <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-emerald-400 border border-emerald-500 bg-emerald-500/20 mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-neutral-400 mb-6">{plan.description}</p>
                <div className="mb-8">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-neutral-400 ml-2">{plan.period}</span>}
                </div>
                <button
                  onClick={() => openAuth("signup")}
                  className={`w-full py-3 rounded-lg font-semibold mb-8 transition-all ${
                    plan.featured
                      ? "bg-emerald-500 hover:bg-emerald-600 text-black"
                      : "border border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  Get Started
                </button>
                <ul className="space-y-3">
                  {plan.features.map((feature, fidx) => (
                    <li key={fidx} className="flex items-center gap-2 text-neutral-300">
                      <Check className="w-5 h-5 text-emerald-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default PricingPage;
