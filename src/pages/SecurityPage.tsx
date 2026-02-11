import React from "react";
import { Shield, Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

const SecurityPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);

  const securityFeatures = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All data transmitted using TLS 1.3 encryption",
    },
    {
      icon: Shield,
      title: "Enterprise SSL/TLS",
      description: "Bank-level security certificates",
    },
    {
      icon: CheckCircle,
      title: "SOC 2 Compliant",
      description: "Regularly audited and certified",
    },
    {
      icon: AlertTriangle,
      title: "GDPR Compliant",
      description: "Full compliance with data protection regulations",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-7xl mx-auto px-6 py-20">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
            Security & Compliance
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {securityFeatures.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all">
                  <Icon className="w-10 h-10 text-emerald-400 mb-4" />
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-neutral-400 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-8">
            <div className="p-8 rounded-xl border border-white/10 bg-white/5">
              <h2 className="text-2xl font-bold mb-4">Data Protection</h2>
              <p className="text-neutral-400 mb-4">
                We implement industry-leading security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 text-neutral-400 space-y-2">
                <li>Automatic backups with redundancy</li>
                <li>Encrypted storage at rest</li>
                <li>Access controls and authentication</li>
                <li>Regular security audits and penetration testing</li>
                <li>Incident response procedures</li>
              </ul>
            </div>

            <div className="p-8 rounded-xl border border-white/10 bg-white/5">
              <h2 className="text-2xl font-bold mb-4">Compliance & Certifications</h2>
              <ul className="list-disc pl-6 text-neutral-400 space-y-2">
                <li>SOC 2 Type II Certified</li>
                <li>GDPR Compliant</li>
                <li>ISO 27001 In Progress</li>
                <li>CCPA Compliant</li>
                <li>Regular third-party audits</li>
              </ul>
            </div>

            <div className="p-8 rounded-xl border border-white/10 bg-white/5">
              <h2 className="text-2xl font-bold mb-4">Report a Security Issue</h2>
              <p className="text-neutral-400 mb-4">
                If you discover a security vulnerability, please email security@curfd-ai.com
              </p>
              <a href="mailto:security@curfd-ai.com" className="inline-block px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-lg transition-all">
                Report Vulnerability
              </a>
            </div>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default SecurityPage;
