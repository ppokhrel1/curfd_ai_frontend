import { ArrowRight, Sparkles } from "lucide-react";
import { scrollToSection } from "@/lib/scroll";

interface HeroProps {
  onAuthClick: (mode: "signin" | "signup") => void;
}

export const Hero = ({ onAuthClick }: HeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-neutral-950">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[140px] translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-500/20 rounded-full blur-[130px] -translate-x-1/4 translate-y-1/4" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto py-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-8 hover:bg-white/10 transition-all duration-300">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-neutral-300">
            Next-Generation CFD Engineering
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] text-white mb-6">
          Simulate. Analyze.{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent">
            Optimize.
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-neutral-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Accelerate CFD workflows with AI-precision computation, real-time
          visualization, and next-level aerodynamic insights.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <button
            onClick={() => onAuthClick("signup")}
            className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={() => scrollToSection("features")}
            className="px-8 py-4 border border-white/10 hover:border-white/30 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all duration-300"
          >
            Explore Features
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto pt-12 border-t border-white/10">
          <StatBlock value="10x" label="Faster Simulation" />
          <StatBlock value="99.9%" label="Precision Accuracy" />
          <StatBlock value="24/7" label="AI Support" />
        </div>
      </div>
    </section>
  );
};

const StatBlock = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center group">
    <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
      {value}
    </div>
    <div className="text-sm text-neutral-500 font-medium">{label}</div>
  </div>
);
