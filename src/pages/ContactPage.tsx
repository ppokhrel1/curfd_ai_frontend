import React from "react";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const ContactPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Get In Touch
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Have questions? We'd love to hear from you
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="p-8 rounded-xl border border-white/10 bg-white/5 text-center">
              <Mail className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">Email</h3>
              <p className="text-neutral-400">support@nooriat.com</p>
            </div>
            <div className="p-8 rounded-xl border border-white/10 bg-white/5 text-center">
              <Phone className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">Phone</h3>
              <p className="text-neutral-400">+1 (555) 123-4567</p>
            </div>
            <div className="p-8 rounded-xl border border-white/10 bg-white/5 text-center">
              <Clock className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">Support Hours</h3>
              <p className="text-neutral-400">24/7 for Enterprise</p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="p-8 rounded-xl border border-white/10 bg-white/5">
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="Your name"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="your@email.com"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="What is this about?"
                />
              </div>
              <div className="mb-8">
                <label className="block text-sm font-semibold mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-emerald-500 outline-none transition-all h-32 resize-none"
                  placeholder="Your message..."
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-all"
              >
                Send Message
              </button>
            </form>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default ContactPage;
