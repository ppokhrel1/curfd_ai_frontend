import React from "react";
import { Code2, Key, Zap } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

const APIPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);

  const endpoints = [
    {
      method: "POST",
      path: "/api/simulations",
      description: "Create a new simulation",
    },
    {
      method: "GET",
      path: "/api/simulations/:id",
      description: "Retrieve simulation results",
    },
    {
      method: "PUT",
      path: "/api/simulations/:id",
      description: "Update simulation parameters",
    },
    {
      method: "DELETE",
      path: "/api/simulations/:id",
      description: "Delete a simulation",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              API Reference
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
              Build powerful integrations with CURFD AI
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="p-8 rounded-xl border border-white/10 bg-white/5">
              <Key className="w-10 h-10 text-emerald-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Authentication</h3>
              <p className="text-neutral-400 mb-4">Use API keys for secure access</p>
              <code className="text-sm bg-black/50 p-2 rounded block break-words">Bearer YOUR_API_KEY</code>
            </div>
            <div className="p-8 rounded-xl border border-white/10 bg-white/5">
              <Zap className="w-10 h-10 text-emerald-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">Rate Limits</h3>
              <p className="text-neutral-400">1000 requests per hour for standard plans</p>
            </div>
            <div className="p-8 rounded-xl border border-white/10 bg-white/5">
              <Code2 className="w-10 h-10 text-emerald-400 mb-4" />
              <h3 className="text-xl font-bold mb-2">SDKs</h3>
              <p className="text-neutral-400">Python, JavaScript, Java, Go</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Main Endpoints</h2>
            <div className="space-y-3">
              {endpoints.map((endpoint, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-white/10 bg-white/5 flex items-center gap-4">
                  <span className={`px-3 py-1 rounded font-semibold text-sm ${
                    endpoint.method === 'POST' ? 'bg-green-500/20 text-green-400' :
                    endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                    endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="flex-1 text-neutral-300">{endpoint.path}</code>
                  <span className="text-neutral-500">{endpoint.description}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/50 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to integrate?</h2>
            <p className="text-neutral-400 mb-6">Start building with our comprehensive API documentation and SDKs</p>
            <button className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-all">
              View Full API Docs
            </button>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default APIPage;
