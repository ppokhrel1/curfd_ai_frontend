interface FeatureItem {
  title: string;
  desc: string;
  icon: string;
  gradient: string;
  stats: string;
}

const features: FeatureItem[] = [
  {
    title: "AI Shape Generator",
    desc: "Describe any 3D shape in natural language and watch AI generate precise CAD geometry in seconds.",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    gradient: "from-purple-500 to-pink-500",
    stats: "10K+ shapes",
  },
  {
    title: "CFD Simulation",
    desc: "Run computational fluid dynamics simulations with real-time physics & accuracy at scale.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    gradient: "from-blue-500 to-cyan-500",
    stats: "99.9% accuracy",
  },
  {
    title: "Real-Time AI Chat",
    desc: "Collaborate with AI to iterate designs, ask questions, and refine your projects instantly.",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    gradient: "from-green-500 to-emerald-500",
    stats: "Sub-second",
  },
  {
    title: "Parts Marketplace",
    desc: "Buy and sell robotic components, sensors, motors & actuators with a live community.",
    icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    gradient: "from-orange-500 to-red-500",
    stats: "5K+ listings",
  },
  {
    title: "3D Viewer",
    desc: "Visualize your CAD in a real-time rendered 3D viewport with physics-based lighting.",
    icon: "M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5",
    gradient: "from-teal-500 to-green-500",
    stats: "Real-time",
  },
  {
    title: "Physics Engine",
    desc: "Simulate motion, torque, collision, joints and robotics kinematics with real-world accuracy.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    gradient: "from-indigo-500 to-purple-500",
    stats: "Live physics",
  },
];

export const ShowcaseGrid = () => {
  return (
    <section id="features" className="py-24 bg-neutral-950 relative">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-sm border border-white/10 bg-white/5 text-neutral-400 mb-4">
            ⚡ Core Capabilities
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              Build Better
            </span>
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            AI-driven engineering, simulation & real-time computational design
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item, i) => (
            <div
              key={i}
              className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Icon */}
              <div
                className={`w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={item.icon} />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-2">
                {item.title}
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                {item.desc}
              </p>

              {/* Stats Badge */}
              <div className="inline-block">
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  {item.stats}
                </span>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
