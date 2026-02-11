import React from "react";
import { Calendar, User, ArrowRight } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import AuthModal from "@/components/auth/AuthModal";

const BlogPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<"signin" | "signup">("signin");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const posts = [
    {
      title: "10x Faster CFD with AI: What Changed",
      excerpt: "Discover how our AI algorithms accelerate simulation time while maintaining 99.9% accuracy",
      author: "Dr. Sarah Chen",
      date: "Feb 8, 2026",
      category: "Technology",
    },
    {
      title: "Real-World Success: Automotive Case Study",
      excerpt: "How a leading car manufacturer reduced design cycles by 40% using CURFD AI",
      author: "John Smith",
      date: "Feb 5, 2026",
      category: "Case Study",
    },
    {
      title: "Understanding Aerodynamic Optimization",
      excerpt: "A comprehensive guide to improving your designs with AI-powered optimization",
      author: "Dr. Emily Rodriguez",
      date: "Feb 1, 2026",
      category: "Tutorial",
    },
    {
      title: "New Features: Mesh Generation 2.0",
      excerpt: "Introducing automated mesh generation with improved accuracy and 50% faster setup",
      author: "Tech Team",
      date: "Jan 28, 2026",
      category: "Product",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              Blog
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Latest news, tutorials, and insights from the CURFD AI team
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {posts.map((post, idx) => (
              <article key={idx} className="p-8 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group cursor-pointer">
                <div className="inline-block px-3 py-1 rounded-full text-sm font-semibold text-emerald-400 border border-emerald-500 bg-emerald-500/20 mb-4">
                  {post.category}
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-emerald-400 transition-colors">
                  {post.title}
                </h3>
                <p className="text-neutral-400 mb-6">{post.excerpt}</p>
                <div className="flex items-center justify-between text-sm text-neutral-500">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" /> {post.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> {post.date}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default BlogPage;
