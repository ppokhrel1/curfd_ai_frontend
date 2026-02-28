import { ArrowRight, Search } from "lucide-react";

interface HeroProps {
  onAuthClick: (mode: "signin" | "signup") => void;
}

export const Hero = ({ onAuthClick }: HeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-neutral-950">
      {/* Background Gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] translate-x-1/3 -translate-y-1/3" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-6xl mx-auto py-32">
        {/* Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] text-white mb-6">
          Design 3D models{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
            with AI
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Describe what you want to build. CURFD generates CAD geometry,
          runs simulations, and helps you iterate — all from a chat interface.
        </p>

        {/* Chat Input CTA */}
        <div className="max-w-2xl mx-auto mb-16">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("prompt") as HTMLInputElement).value;
              if (input.trim()) {
                sessionStorage.setItem("pending_chat_message", input);
                onAuthClick("signup");
              }
            }}
            className="relative group"
          >
            <div className="relative flex items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-2">
              <div className="pl-4 text-neutral-500">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                name="prompt"
                placeholder="Describe a drone frame with 4 arms..."
                className="flex-1 bg-transparent border-none text-white placeholder-neutral-500 focus:ring-0 px-4 py-3 text-base md:text-lg"
                autoComplete="off"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black font-semibold rounded-xl transition-all duration-200 flex items-center gap-2"
              >
                Generate
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
          <div className="flex justify-center gap-6 mt-6">
            <button 
              onClick={() => onAuthClick("signin")} 
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Sign In
            </button>
            <a href="#features" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Features
            </a>
          </div>
        </div>

        {/* Quick highlights */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 pt-8 text-sm text-neutral-500">
          <span>Text-to-CAD generation</span>
          <span className="hidden sm:inline text-neutral-700">|</span>
          <span>CFD simulation</span>
          <span className="hidden sm:inline text-neutral-700">|</span>
          <span>Physics analysis</span>
        </div>
      </div>
    </section>
  );
};
