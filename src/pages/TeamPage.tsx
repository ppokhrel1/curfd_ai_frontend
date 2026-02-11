import React from "react";
import { Linkedin, Twitter, Mail } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const TeamPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const teamMembers = [
    {
      name: "Pujan Pokharel, Phd",
      role: "CEO & Co-Founder",
      bio: "PhD in Computational Fluid Dynamics with 15+ years in aerospace engineering",
      image: "https://media.licdn.com/dms/image/v2/C4E03AQEdG61KEKMAnQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1517523910321?e=1772668800&v=beta&t=glK25untwl3v8gnQPBgEUDBNbEp_sOacOYyXnvMM3IU",
      socials: {
        linkedin: "https://linkedin.com",
        twitter: "https://twitter.com",
      },
    },
    {
      name: "Er. Anup Adhikari",
      role: "CTO & Co-Founder",
      bio: "Machine Learning expert with background in AI and simulation software",
      image: "https://media.licdn.com/dms/image/v2/D4D03AQETgFdc4JS1YQ/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1690361277071?e=2147483647&v=beta&t=VCQLv92lL8cVtyPJ48pK8q5gVAnz3K1v005c0XnPHn0",
      socials: {
        linkedin: "https://linkedin.com",
        twitter: "https://twitter.com",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Our Team
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Meet the talented people building the future of CFD simulation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="p-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group">
                <div className="w-24 h-24 mb-4 rounded-lg overflow-hidden border border-white/10">
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-bold mb-1 group-hover:text-emerald-400 transition-colors">
                  {member.name}
                </h3>
                <p className="text-emerald-400 font-semibold text-sm mb-3">{member.role}</p>
                <p className="text-neutral-400 text-sm mb-6">{member.bio}</p>
                <div className="flex gap-3">
                  <a
                    href={member.socials.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all"
                  >
                    <Linkedin className="w-4 h-4 text-neutral-400 hover:text-emerald-400" />
                  </a>
                  <a
                    href={member.socials.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all"
                  >
                    <Twitter className="w-4 h-4 text-neutral-400 hover:text-emerald-400" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/50 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Join Our Team</h2>
            <p className="text-neutral-400 mb-6">We're always looking for talented people to join us</p>
            <a href="/careers" className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-all">
              View Openings
            </a>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default TeamPage;
