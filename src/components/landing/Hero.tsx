import { ArrowRight, Play, Search } from "lucide-react";

interface HeroProps {
  onAuthClick: (mode: "signin" | "signup") => void;
}

export const Hero = ({ onAuthClick }: HeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center bg-white">
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 py-32">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary-200 bg-primary-50">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              <span className="text-xs font-medium text-primary-700 tracking-wide">
                AI-native CAD &middot; idea to printable parts
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-6xl lg:text-[4rem] font-semibold leading-[1.1] text-neutral-900">
              Describe it.{" "}
              <span className="text-primary-500">Split it.</span>{" "}
              <br className="hidden sm:block" />
              Print every piece.
            </h1>

            {/* Subheading */}
            <p className="text-lg text-neutral-500 max-w-lg leading-relaxed">
              Type a prompt — or drop in an image — and get a colored 3D
              model that auto-decomposes into named, printable parts.
              Download each part as STL and slice straight to your printer.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => onAuthClick("signup")}
                className="group px-7 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-full transition-all flex items-center gap-2 shadow-sm"
              >
                Start free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button className="group px-6 py-3 border border-neutral-300 hover:border-neutral-400 text-neutral-600 hover:text-neutral-800 font-medium rounded-full transition-all flex items-center gap-2">
                <Play className="w-4 h-4" />
                Watch demo
              </button>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-10 pt-6 border-t border-neutral-100">
              {[
                { value: "~60 s", label: "prompt → mesh" },
                { value: "auto-split", label: "into named parts" },
                { value: "STL/GLB", label: "slicer-ready output" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-semibold text-neutral-800">{stat.value}</div>
                  <div className="text-xs text-neutral-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: 3D Preview viewport */}
          <div className="relative">
            <div className="relative aspect-[4/3] rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden shadow-sm">
              {/* Dot grid */}
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.07) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Ground grid */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />

              {/* 3D model placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <svg width="200" height="180" viewBox="0 0 200 180" className="opacity-50">
                    <polygon points="100,20 180,60 100,100 20,60" fill="none" stroke="rgba(224,152,32,0.5)" strokeWidth="1.5" />
                    <polygon points="20,60 100,100 100,160 20,120" fill="none" stroke="rgba(192,122,24,0.4)" strokeWidth="1.5" />
                    <polygon points="180,60 100,100 100,160 180,120" fill="none" stroke="rgba(154,94,20,0.35)" strokeWidth="1.5" />
                    <line x1="100" y1="60" x2="30" y2="30" stroke="rgba(224,152,32,0.3)" strokeWidth="1" />
                    <line x1="100" y1="60" x2="170" y2="30" stroke="rgba(224,152,32,0.3)" strokeWidth="1" />
                    <line x1="100" y1="60" x2="30" y2="130" stroke="rgba(224,152,32,0.3)" strokeWidth="1" />
                    <line x1="100" y1="60" x2="170" y2="130" stroke="rgba(224,152,32,0.3)" strokeWidth="1" />
                    <circle cx="30" cy="30" r="12" fill="none" stroke="rgba(224,152,32,0.4)" strokeWidth="1" />
                    <circle cx="170" cy="30" r="12" fill="none" stroke="rgba(224,152,32,0.4)" strokeWidth="1" />
                    <circle cx="30" cy="130" r="12" fill="none" stroke="rgba(224,152,32,0.4)" strokeWidth="1" />
                    <circle cx="170" cy="130" r="12" fill="none" stroke="rgba(224,152,32,0.4)" strokeWidth="1" />
                  </svg>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-neutral-400">
                    160 &times; 160 &times; 24 mm
                  </div>
                </div>
              </div>

              {/* Toolbar chips */}
              <div className="absolute top-3 left-3 flex gap-1.5">
                {["wireframe", "axes", "orbit"].map((tool, i) => (
                  <span
                    key={tool}
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded-full ${
                      i === 1
                        ? "border border-primary-300 text-primary-600 bg-primary-50"
                        : "border border-neutral-200 text-neutral-400 bg-white"
                    }`}
                  >
                    {tool}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="absolute top-3 right-3 px-3 py-2 bg-white/90 border border-neutral-200 rounded-lg">
                <div className="text-[9px] font-mono text-neutral-400 uppercase mb-1">Stats</div>
                <div className="text-[11px] font-mono text-neutral-500 space-y-0.5">
                  <div>tris 14,820</div>
                  <div>verts 7,410</div>
                </div>
              </div>

              {/* Axes */}
              <div className="absolute bottom-3 left-3">
                <svg viewBox="0 0 40 40" width="36" height="36" className="opacity-50">
                  <line x1="20" y1="20" x2="36" y2="20" stroke="#ef4444" strokeWidth="1.5" />
                  <line x1="20" y1="20" x2="20" y2="4" stroke="#22c55e" strokeWidth="1.5" />
                  <line x1="20" y1="20" x2="8" y2="32" stroke="#3b82f6" strokeWidth="1.5" />
                </svg>
              </div>

              {/* Floating chat preview — frames the parts → print story */}
              <div className="absolute bottom-3 left-14 right-14">
                <div className="bg-white/95 border border-neutral-200 rounded-xl p-3 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-primary-600 uppercase">3 parts ready</span>
                  </div>
                  <div className="text-[12px] text-neutral-600">
                    &ldquo;a desk lamp&rdquo; &middot; base, arm, shade
                  </div>
                  <div className="text-[10px] font-mono text-primary-500/70 mt-1">
                    download all &middot; STL · GLB
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt demo */}
        <div className="mt-28 max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-neutral-800 mb-2">Try it yourself</h2>
            <p className="text-neutral-500 text-sm">
              Describe what you want to build.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("prompt") as HTMLInputElement).value;
              if (input.trim()) {
                sessionStorage.setItem("pending_chat_message", input);
                onAuthClick("signup");
              }
            }}
          >
            <div className="flex items-center bg-white border border-neutral-300 rounded-full p-1.5 shadow-sm hover:shadow-md hover:border-neutral-400 transition-all">
              <div className="pl-4 text-neutral-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                name="prompt"
                placeholder="a quadcopter frame, 160 mm motor-to-motor, 3 mm arms..."
                className="flex-1 bg-transparent border-none text-neutral-800 placeholder-neutral-400 focus:ring-0 focus:outline-none px-4 py-3 text-base"
                autoComplete="off"
              />
              <button
                type="submit"
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-full transition-all flex items-center gap-2 mr-0.5"
              >
                Generate
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
          <div className="flex justify-center gap-4 mt-4 text-xs text-neutral-400">
            <span>drone frames</span>
            <span>&middot;</span>
            <span>brackets</span>
            <span>&middot;</span>
            <span>enclosures</span>
            <span>&middot;</span>
            <span>mounts</span>
          </div>
        </div>
      </div>
    </section>
  );
};
