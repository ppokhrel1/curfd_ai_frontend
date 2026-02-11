import React from "react";
import { Users, MessageSquare, Github, Slack } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const CommunityPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const channels = [
    {
      icon: MessageSquare,
      name: "Discord Server",
      description: "Real-time chat with 2000+ community members",
      members: "2,500+",
      link: "https://discord.gg/curfdai",
    },
    {
      icon: Github,
      name: "GitHub Discussions",
      description: "Ask questions and share solutions",
      members: "1,200+",
      link: "https://github.com/curfdai",
    },
    {
      icon: Slack,
      name: "Slack Community",
      description: "Dedicated workspace for collaboration",
      members: "800+",
      link: "https://slack.curfdai.com",
    },
    {
      icon: Users,
      name: "Forums",
      description: "Ask questions and discuss topics",
      members: "5,000+",
      link: "/contact",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Community
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Join thousands of engineers building the future of CFD
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {channels.map((channel, idx) => {
              const Icon = channel.icon;
              return (
                <a
                  key={idx}
                  href={channel.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all cursor-pointer group"
                >
                  <Icon className="w-12 h-12 text-emerald-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">
                    {channel.name}
                  </h3>
                  <p className="text-neutral-400 mb-4">{channel.description}</p>
                  <div className="text-sm text-emerald-400 font-semibold">{channel.members} members</div>
                </a>
              );
            })}
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/50 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Contribute Back</h2>
            <p className="text-neutral-400 mb-6">Help improve CURFD AI by sharing feedback, contributing code, or helping other users</p>
            <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-all">
              Get Involved
            </button>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default CommunityPage;
