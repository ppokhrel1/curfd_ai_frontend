import { Github, Linkedin, Mail, Twitter } from "lucide-react";
import { CurfdLogo } from "./Navbar";

export const Footer = () => {
  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com/curfdai", label: "Twitter" },
    { icon: Github, href: "https://github.com/curfdai", label: "GitHub" },
    { icon: Linkedin, href: "https://linkedin.com/company/curfdai", label: "LinkedIn" },
    { icon: Mail, href: "mailto:contact@curfd-ai.com", label: "Email" },
  ];

  const columns = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "#features" },
        { name: "Pricing", href: "#pricing" },
        { name: "Gallery", href: "#gallery" },
        { name: "Changelog", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { name: "Documentation", href: "#docs" },
        { name: "API Reference", href: "#" },
        { name: "Examples", href: "#" },
        { name: "Blog", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About", href: "#" },
        { name: "Careers", href: "#" },
        { name: "Contact", href: "mailto:contact@curfd-ai.com" },
        { name: "Privacy", href: "#" },
      ],
    },
  ];

  return (
    <footer className="bg-neutral-900 text-neutral-400">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Main grid */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-5 gap-10 lg:gap-16">
          {/* Brand column */}
          <div className="col-span-2">
            <a href="/" className="flex items-center gap-2.5 mb-4">
              <CurfdLogo size={24} />
              <span className="text-[17px] font-bold text-white tracking-tight">curfd</span>
            </a>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-xs mb-6">
              AI-powered 3D model generation for makers. Describe a part, get a printable model.
            </p>
            <div className="flex gap-2.5">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center transition-colors"
                    aria-label={social.label}
                  >
                    <Icon className="w-4 h-4 text-neutral-400" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-4">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-sm text-neutral-500 hover:text-white transition-colors">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-neutral-500">
            &copy; {new Date().getFullYear()} CURFD. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <a href="#" className="hover:text-neutral-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-neutral-300 transition-colors">Privacy</a>
            <span className="font-mono text-neutral-600">v2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
