import { Menu, X, Zap, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { scrollToSection } from "@/lib/scroll";

interface NavbarProps {
  onAuthClick: (mode: "signin" | "signup") => void;
}

export const Navbar = ({ onAuthClick }: NavbarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showWhatWeDo, setShowWhatWeDo] = useState(false);

  const navLinks = [
    { name: "Who We Are", href: "/about" },
    { name: "What We Do", href: "#features", hasDropdown: true },
    { name: "Pricing", href: "/pricing" },
    { name: "Our Team", href: "/team" },
    { name: "Contact", href: "/contact" },
  ];

  const whatWeDoItems = [
    { title: "AI-Powered Simulation", description: "Advanced CFD with AI acceleration" },
    { title: "Real-Time Visualization", description: "Interactive 3D visualization" },
    { title: "Cloud Integration", description: "Seamless cloud-based platform" },
    { title: "Optimization Tools", description: "Automated design optimization" },
  ];

  const handleNavClick = (href: string) => {
    if (href.startsWith("#")) {
      scrollToSection(href.slice(1));
    } else if (href.startsWith("/")) {
      // Navigation will be handled by React Router through Link component
      window.location.href = href;
    }
    setIsOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-xl shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 group-hover:scale-110 transition-all duration-300">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold text-white">NOORIAT</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.href.startsWith("/") ? (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-neutral-400 hover:text-white font-medium transition-colors duration-200 relative group"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-green-500 group-hover:w-full transition-all duration-300" />
                </Link>
              ) : link.hasDropdown ? (
                <div
                  key={link.name}
                  className="relative group"
                  onMouseEnter={() => setShowWhatWeDo(true)}
                  onMouseLeave={() => setShowWhatWeDo(false)}
                >
                  <button
                    onClick={() => handleNavClick(link.href)}
                    className="text-neutral-400 hover:text-white font-medium transition-colors duration-200 relative flex items-center gap-1 group"
                  >
                    {link.name}
                    <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform" />
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-green-500 group-hover:w-full transition-all duration-300" />
                  </button>

                  {/* Dropdown Menu */}
                  {showWhatWeDo && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-neutral-950 border border-white/10 rounded-xl shadow-xl overflow-hidden animate-fadeIn">
                      {whatWeDoItems.map((item, idx) => (
                        <a
                          key={idx}
                          href="#features"
                          onClick={(e) => {
                            e.preventDefault();
                            scrollToSection("features");
                            setShowWhatWeDo(false);
                          }}
                          className="block px-4 py-3 hover:bg-white/5 border-b border-white/10 last:border-b-0 transition-all group"
                        >
                          <h4 className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-neutral-400 text-xs mt-1">{item.description}</p>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  key={link.name}
                  onClick={() => handleNavClick(link.href)}
                  className="text-neutral-400 hover:text-white font-medium transition-colors duration-200 relative group"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-emerald-400 to-green-500 group-hover:w-full transition-all duration-300" />
                </button>
              )
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
                <div key={link.name}>
                  {link.href.startsWith("/") ? (
                    <Link
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className="text-neutral-400 hover:text-white font-medium transition-colors py-2 text-left block"
                    >
                      {link.name}
                    </Link>
                  ) : link.hasDropdown ? (
                    <div>
                      <button
                        onClick={() => handleNavClick(link.href)}
                        className="text-neutral-400 hover:text-white font-medium transition-colors py-2 text-left w-full flex items-center gap-1"
                      >
                        {link.name}
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <div className="ml-4 mt-2 space-y-2 border-l border-white/10 pl-4">
                        {whatWeDoItems.map((item, idx) => (
                          <a
                            key={idx}
                            href="#features"
                            onClick={(e) => {
                              e.preventDefault();
                              scrollToSection("features");
                              setIsOpen(false);
                            }}
                            className="block py-2 hover:text-emerald-400 transition-colors"
                          >
                            <p className="text-white text-sm font-medium">{item.title}</p>
                            <p className="text-neutral-400 text-xs">{item.description}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleNavClick(link.href)}
                      className="text-neutral-400 hover:text-white font-medium transition-colors py-2 text-left w-full"
                    >
                      {link.name}
                    </button>
                  )}
                </div>
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
