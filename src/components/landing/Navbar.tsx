import { Menu, X, ChevronRight } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  onAuthClick: (mode: "signin" | "signup") => void;
}

function CurfdLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <polygon points="16,2 30,10 16,18 2,10" fill="#e09820" opacity="0.95" />
      <polygon points="2,10 16,18 16,30 2,22" fill="#c07a18" opacity="0.85" />
      <polygon points="30,10 16,18 16,30 30,22" fill="#9a5e14" opacity="0.75" />
      <line x1="8" y1="6" x2="24" y2="14" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1="12" y1="4" x2="28" y2="12" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
    </svg>
  );
}

export { CurfdLogo };

export const Navbar = ({ onAuthClick }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Gallery", href: "#gallery" },
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "Docs", href: "#docs" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-neutral-150 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5">
            <CurfdLogo size={24} />
            <div className="flex items-baseline gap-2">
              <span className="text-[17px] font-bold text-neutral-900 tracking-tight">curfd</span>
              <span className="hidden sm:inline text-[9px] font-mono text-primary-600 bg-primary-50 border border-primary-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">beta</span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-[13px] text-neutral-500 hover:text-neutral-900 font-medium transition-all px-3.5 py-2 rounded-lg hover:bg-neutral-50"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => onAuthClick("signin")}
              className="px-4 py-2 text-[13px] text-neutral-600 hover:text-neutral-900 font-medium transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => onAuthClick("signup")}
              className="group px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-[13px] font-medium rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              Get started
              <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-3 border-t border-neutral-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col gap-0.5">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-[14px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg font-medium py-2.5 px-3 transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-neutral-100">
                <button
                  onClick={() => { onAuthClick("signin"); setIsOpen(false); }}
                  className="w-full px-3 py-2.5 text-neutral-600 hover:bg-neutral-50 rounded-lg font-medium text-[14px] text-left transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => { onAuthClick("signup"); setIsOpen(false); }}
                  className="w-full px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg text-[14px] transition-colors"
                >
                  Get started
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
