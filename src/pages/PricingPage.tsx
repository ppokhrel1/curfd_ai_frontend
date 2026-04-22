import { Navbar } from "@/components/landing/Navbar";
import { Check } from "lucide-react";
import { useState } from "react";

interface PricingPageProps {
  onAuthClick?: (mode: "signin" | "signup") => void;
}

/* ── Plan data ── */
interface Plan {
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  priceSuffix: string;
  description: string;
  badge?: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  ctaStyle: "outline" | "filled";
}

const plans: Plan[] = [
  {
    name: "Maker",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    priceSuffix: "free",
    description: "For hobbyists and weekend builders.",
    features: [
      "25 generations / month",
      "2 active sessions",
      "Public gallery",
      "STL / GLB export",
    ],
    cta: "Start free",
    highlighted: false,
    ctaStyle: "outline",
  },
  {
    name: "Builder",
    monthlyPrice: "$18",
    yearlyPrice: "$14",
    priceSuffix: "/mo",
    description: "For serious projects that need full power.",
    badge: "Most popular",
    features: [
      "500 generations / month",
      "Unlimited sessions",
      "Private gallery",
      "SCAD source files",
      "Genetic optimization",
      "Priority queue",
    ],
    cta: "Go builder",
    highlighted: true,
    ctaStyle: "filled",
  },
  {
    name: "Studio",
    monthlyPrice: "$64",
    yearlyPrice: "$52",
    priceSuffix: "/mo/seat",
    description: "For teams shipping production parts.",
    features: [
      "Unlimited generations",
      "Team workspaces",
      "Shared part library",
      "API access",
      "10 GB storage",
      "SSO & audit logs",
    ],
    cta: "Contact us",
    highlighted: false,
    ctaStyle: "outline",
  },
];

const PricingPage = ({ onAuthClick }: PricingPageProps) => {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  const handleAuth = (mode: "signin" | "signup") => {
    if (onAuthClick) {
      onAuthClick(mode);
    }
  };

  const handleCta = (plan: Plan) => {
    if (plan.name === "Studio") {
      window.location.href = "mailto:contact@curfd-ai.com";
    } else {
      handleAuth("signup");
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-800">
      {/* Navbar */}
      <Navbar onAuthClick={handleAuth} />

      {/* Header */}
      <header className="pt-28 pb-12 px-6 text-center">
        <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">
          Pricing
        </span>
        <h1 className="text-4xl font-semibold text-neutral-800 mt-3 mb-4">
          Pay for the prints you ship.
        </h1>
        <p className="text-neutral-500 max-w-md mx-auto mb-8">
          Start free, upgrade when you need more power.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center bg-neutral-100 rounded-full p-0.5">
          <button
            onClick={() => setBilling("monthly")}
            className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${
              billing === "monthly"
                ? "bg-neutral-50 text-white"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            className={`px-5 py-1.5 text-sm font-medium rounded-full transition-colors ${
              billing === "yearly"
                ? "bg-neutral-50 text-white"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Yearly
          </button>
        </div>
      </header>

      {/* Plan cards */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl flex flex-col ${
                plan.highlighted
                  ? "bg-primary-50 border-2 border-primary-200"
                  : "bg-white border border-neutral-200"
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <span className="absolute -top-3 left-6 px-3 py-0.5 bg-primary-500 text-white text-[11px] font-semibold rounded-full">
                  {plan.badge}
                </span>
              )}

              {/* Name */}
              <h3 className="text-lg font-semibold text-neutral-800 mb-1">
                {plan.name}
              </h3>
              <p className="text-sm text-neutral-500 mb-5">{plan.description}</p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-semibold text-neutral-900">
                  {billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                </span>
                <span className="text-sm text-neutral-400">{plan.priceSuffix}</span>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleCta(plan)}
                className={`w-full py-2.5 text-sm font-medium rounded-lg transition-colors mb-6 ${
                  plan.ctaStyle === "filled"
                    ? "bg-neutral-50 text-white hover:bg-neutral-800"
                    : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {plan.cta}
              </button>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        plan.highlighted ? "text-primary-500" : "text-neutral-400"
                      }`}
                    />
                    <span className="text-sm text-neutral-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
