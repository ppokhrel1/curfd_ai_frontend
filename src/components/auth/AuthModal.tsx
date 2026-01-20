import { useAuthStore } from "@/lib/auth";
import { Github, Lock, Mail, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "signin" | "signup";
  onSwitchMode: () => void;
}

const AuthModal = ({ isOpen, onClose, mode, onSwitchMode }: AuthModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [localError, setLocalError] = useState<string | null>(null);

  const navigate = useNavigate();
  const {
    signIn,
    signUp,
    demoLogin,
    signInWithProvider,
    isAuthenticated,
    isLoading,
    error,
  } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home");
      onClose();
    }
  }, [isAuthenticated, navigate, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    try {
      if (mode === "signin") {
        if (
          formData.email === "demo@curfd.ai" &&
          formData.password === "Demo1234"
        ) {
          demoLogin();
        } else {
          await signIn(formData.email, formData.password);
        }
      } else {
        await signUp(formData.email, formData.password, formData.name);
      }
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  };

  const handleProviderAuth = async (provider: "google" | "github") => {
    setLocalError(null);
    try {
      await signInWithProvider(provider);
    } catch (err) {
      setLocalError(`${provider} sign in failed`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[380px] bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-white/5">
        
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200 z-50"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative pt-8 pb-4 px-6 text-center">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10 group">
            <Lock className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
            {mode === "signin" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-neutral-400 text-xs font-medium">
            {mode === "signin"
              ? "Sign in to continue your creative journey"
              : "Join the future of 3D modeling today"}
          </p>
        </div>

        {(localError || error) && (
          <div className="mx-6 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-400 text-xs animate-in slide-in-from-top-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-1.5 shrink-0" />
            <span className="font-medium">{localError || error}</span>
          </div>
        )}

        {/* Social Auth */}
        <div className="px-6 space-y-2.5">
          <button
            onClick={() => handleProviderAuth("google")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-white text-black hover:bg-neutral-100 rounded-xl font-semibold text-xs transition-all duration-200 border border-transparent disabled:opacity-50 hover:shadow-lg hover:shadow-white/10 hover:-translate-y-0.5 active:translate-y-0"
          >
            <GoogleIcon className="w-4 h-4" />
            Continue with Google
          </button>
          <button
            onClick={() => handleProviderAuth("github")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-[#24292e] text-white hover:bg-[#2f363d] rounded-xl font-semibold text-xs transition-all duration-200 border border-neutral-700/50 disabled:opacity-50 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </button>
        </div>

        <div className="my-5 px-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />
          <span className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase">
            Or continue with email
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-8 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <label className="text-neutral-300 text-[10px] font-bold ml-1 uppercase tracking-wide">
                Full Name
              </label>
              <div className="relative group">
                <User className="absolute left-3.5 top-3 h-3.5 w-3.5 text-neutral-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="John Doe"
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-800/50 hover:bg-neutral-800/80 rounded-lg border border-neutral-700/50 text-white focus:border-emerald-500/50 focus:bg-neutral-800 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200 text-sm placeholder:text-neutral-600"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-neutral-300 text-[10px] font-bold ml-1 uppercase tracking-wide">
              Email Address
            </label>
            <div className="relative group">
              <Mail className="absolute left-3.5 top-3 h-3.5 w-3.5 text-neutral-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Name@company.com"
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-800/50 hover:bg-neutral-800/80 rounded-lg border border-neutral-700/50 text-white focus:border-emerald-500/50 focus:bg-neutral-800 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200 text-sm placeholder:text-neutral-600"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-neutral-300 text-[10px] font-bold ml-1 uppercase tracking-wide">
              Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-3.5 top-3 h-3.5 w-3.5 text-neutral-500 group-focus-within:text-emerald-400 transition-colors" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-800/50 hover:bg-neutral-800/80 rounded-lg border border-neutral-700/50 text-white focus:border-emerald-500/50 focus:bg-neutral-800 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all duration-200 text-sm placeholder:text-neutral-600"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 rounded-xl text-white font-bold text-xs shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-3 relative overflow-hidden group"
          >
             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
            </span>
          </button>

          <div className="text-center pt-1">
            <p className="text-neutral-400 text-xs">
              {mode === "signin"
                ? "Don't have an account?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={onSwitchMode}
                className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors hover:underline decoration-emerald-400/30 underline-offset-4"
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
