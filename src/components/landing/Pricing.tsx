import { Check } from "lucide-react";

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
    name: "Maker",
    price: "$0",
    period: "free forever",
    description: "Start building — no credit card.",
    features: [
      "25 generations / month",
      "2 active sessions",
      "Public gallery",
      "STL / GLB export",
      "3D viewer + physics rendering",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    name: "Builder",
    price: "$18",
    period: "/ mo · billed yearly",
    description: "For serious projects that ship.",
    badge: "Most popular",
    features: [
      "500 generations / month",
      "Unlimited sessions",
      "Private gallery",
      "SCAD source access",
      "Optimization jobs",
      "Priority queue",
    ],
    cta: "Go builder",
    highlighted: true,
  },
  {
    name: "Studio",
    price: "$64",
    period: "/ mo · per seat",
    description: "For teams and API access.",
    features: [
      "Unlimited generations",
      "Team workspaces",
      "Shared asset library",
      "REST API access",
      "10 GB storage",
      "SSO · SAML",
    ],
    cta: "Contact us",
    highlighted: false,
  },
];

interface PricingProps {
  onAuthClick: (mode: "signin" | "signup") => void;
}

export const Pricing = ({ onAuthClick }: PricingProps) => {
  const handleCta = (tier: PricingTier) => {
    if (tier.name === "Studio") {
      window.location.href = "mailto:contact@curfd-ai.com";
    } else {
      onAuthClick("signup");
    }
  };

  return (
    <section id="pricing" className="py-24 bg-white border-t border-neutral-100">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="text-xs font-mono uppercase text-neutral-400 tracking-widest mb-3">Pricing</div>
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-800 mb-3">
            Pay for the prints you ship.
          </h2>
          <p className="text-neutral-500 max-w-lg mx-auto text-sm">
            Start free. Upgrade when you iterate a lot. Cancel whenever.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl p-8 flex flex-col transition-all ${
                tier.highlighted
                  ? "bg-primary-50 border-2 border-primary-200 shadow-sm"
                  : "bg-white border border-neutral-200 hover:border-neutral-300"
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-6">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-primary-500 text-white">
                    {tier.badge}
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-neutral-500 mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-4xl font-semibold text-neutral-900">{tier.price}</span>
                  {tier.period && (
                    <span className="text-xs font-mono text-neutral-400">{tier.period}</span>
                  )}
                </div>
                <p className="text-sm text-neutral-500">{tier.description}</p>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleCta(tier)}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all mb-8 ${
                  tier.highlighted
                    ? "bg-neutral-900 hover:bg-neutral-800 text-white"
                    : "bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 hover:border-neutral-400"
                }`}
              >
                {tier.cta}
              </button>

              {/* Features */}
              <ul className="space-y-3 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                      tier.highlighted ? "text-primary-600" : "text-neutral-400"
                    }`} />
                    <span className="text-neutral-600">{feature}</span>
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
