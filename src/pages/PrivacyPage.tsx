import React from "react";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";

const PrivacyPage = () => {
  const [authModalOpen, setAuthModalOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <Navbar onAuthClick={openAuth} />
      
      <main className="pt-32">
        <section className="max-w-4xl mx-auto px-6 py-20">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          
          <div className="text-neutral-400 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">1. Introduction</h2>
              <p>
                CURFD AI ("we" or "us" or "our") operates the CURFD AI website (the "Service"). This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">2. Information Collection and Use</h2>
              <p>
                We collect several types of information for various purposes to provide and improve our Service to you.
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>Account information (name, email, password)</li>
                <li>Usage data and analytics</li>
                <li>Device information</li>
                <li>Simulation data and results</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">3. Use of Data</h2>
              <p>
                CURFD AI uses the collected data for various purposes:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-2">
                <li>To provide and maintain our Service</li>
                <li>To notify you about changes to our Service</li>
                <li>To allow you to participate in interactive features</li>
                <li>To provide customer support</li>
                <li>To gather analysis or valuable information for improvement</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">4. Security of Data</h2>
              <p>
                The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-3">5. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at: privacy@curfd-ai.com
              </p>
            </div>
          </div>
        </section>
      </main>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authMode} />

      <Footer />
    </div>
  );
};

export default PrivacyPage;
