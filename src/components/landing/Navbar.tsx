import { Menu, X, Zap } from "lucide-react";
import { useState } from "react";

interface NavbarProps {
  onAuthClick: (mode: "signin" | "signup") => void;
}

export const Navbar = ({ onAuthClick }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: "Features", href: "#features" },
    { name: "How It Works", href: "#how-it-works" },
    { name: "Pricing", href: "#pricing" },
    { name: "Contact", href: "#contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-xl shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all duration-300">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold text-white">CURFD AI</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-neutral-400 hover:text-white font-medium transition-colors duration-200 relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-green-500 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => onAuthClick("signin")}
              className="px-5 py-2 text-neutral-300 hover:text-white transition-colors duration-200 font-medium"
            >
              Sign In
            </button>
            <button
              onClick={() => onAuthClick("signup")}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black font-semibold rounded-lg shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 transition-all duration-300"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/10 animate-fadeIn">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-neutral-400 hover:text-white font-medium transition-colors py-2"
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    onAuthClick("signin");
                    setIsOpen(false);
                  }}
                  className="w-full px-5 py-2.5 text-neutral-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors font-medium text-left"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onAuthClick("signup");
                    setIsOpen(false);
                  }}
                  className="w-full px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-black font-semibold rounded-lg"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
