import { Check, Zap } from "lucide-react";

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  badge?: string;
  features: string[];
  cta: string;
  highlighted: boolean;
}

const tiers: PricingTier[] = [
  {
    name: "Standard",
    price: "Free",
    period: "forever",
    description: "For designers exploring AI-assisted CAD with common shapes.",
    features: [
      "AI shape generation from text",
      "Standard CAD editor",
      "Common shapes (box, cylinder, sphere, extrusions)",
      "3D viewer with physics-based rendering",
      "Scientific volume & mass analysis",
      "10 shape renders / day",
      "Export STL",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$29",
    period: "/ month",
    description: "For engineers who need complex geometry optimization.",
    badge: "Most Popular",
    features: [
      "Everything in Standard",
      "Genetic algorithm shape optimization",
      "Complex parametric geometries",
      "Unlimited renders",
      "CFD simulation (airflow, pressure)",
      "AI parameter tuning",
      "Priority GPU processing",
      "Export STL, STEP, OBJ",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams that need scale, API access, and SLA guarantees.",
    features: [
      "Everything in Professional",
      "REST API access",
      "Team collaboration",
      "Custom simulation pipelines",
      "Dedicated GPU workers",
      "SLA & uptime guarantee",
      "Onboarding & support",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
];

interface PricingProps {
  onAuthClick: (mode: "signin" | "signup") => void;
}

export const Pricing = ({ onAuthClick }: PricingProps) => {
  const handleCta = (tier: PricingTier) => {
    if (tier.name === "Enterprise") {
      window.location.href = "mailto:contact@curfd-ai.com";
    } else {
      onAuthClick("signup");
    }
  };

  return (
    <section id="pricing" className="py-24 bg-neutral-950 relative border-t border-white/10">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-green-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-sm border border-white/10 bg-white/5 text-neutral-400 mb-4">
            💳 Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple,{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              Transparent
            </span>{" "}
            Pricing
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Start free with standard shapes. Upgrade when your designs get complex.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                tier.highlighted
                  ? "bg-gradient-to-b from-emerald-950/60 to-neutral-900/80 border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 scale-[1.03]"
                  : "bg-white/5 border border-white/10 hover:border-white/20"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-500 text-black shadow-lg shadow-emerald-500/30">
                    <Zap className="w-3 h-3" />
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Name & Price */}
              <div className="mb-6">
                <h3 className={`text-lg font-bold mb-1 ${tier.highlighted ? "text-emerald-400" : "text-white"}`}>
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                  {tier.period && (
                    <span className="text-neutral-500 text-sm">{tier.period}</span>
                  )}
                </div>
                <p className="text-neutral-400 text-sm leading-relaxed">{tier.description}</p>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleCta(tier)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 mb-8 ${
                  tier.highlighted
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02]"
                    : "bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20"
                }`}
              >
                {tier.cta}
              </button>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                        tier.highlighted ? "text-emerald-400" : "text-neutral-400"
                      }`}
                    />
                    <span className="text-neutral-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
