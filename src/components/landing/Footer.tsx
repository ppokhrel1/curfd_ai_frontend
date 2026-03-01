import { Github, Linkedin, Mail, Twitter, Zap } from "lucide-react";

export const Footer = () => {
  const productLinks = [
    { name: "Features", href: "#features" },
  ];

  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com/curfdai", label: "Twitter" },
    { icon: Github, href: "https://github.com/curfdai", label: "GitHub" },
    { icon: Linkedin, href: "https://linkedin.com/company/curfdai", label: "LinkedIn" },
    { icon: Mail, href: "mailto:contact@curfd-ai.com", label: "Email" },
  ];

  return (
    <footer className="bg-neutral-950 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          {/* Brand Column */}
          <div className="max-w-xs">
            <a href="/" className="flex items-center gap-2 mb-4 group">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-lg shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all">
                <Zap className="w-5 h-5 text-black" />
              </div>
              <span className="text-lg font-bold text-white">CURFD AI</span>
            </a>
            <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
              AI-powered CAD generation and CFD simulation.
            </p>

            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300 group"
                    aria-label={social.label}
                  >
                    <Icon className="w-4 h-4 text-neutral-400 group-hover:text-emerald-400 transition-colors" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-white font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              {productLinks.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-sm text-neutral-400 hover:text-emerald-400 transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:contact@curfd-ai.com"
                  className="text-sm text-neutral-400 hover:text-emerald-400 transition-colors"
                >
                  contact@curfd-ai.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-neutral-500">
              © {new Date().getFullYear()} CURFD AI. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
