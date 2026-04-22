import { useAuthStore } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";
import { validateEmail, validatePassword, validateName } from "@/utils/validators";
import { Github, Lock, Mail, User } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface AuthPageProps {
  mode?: "signin" | "signup";
}

/* ── Curfd isometric-cube logo (same SVG as Navbar) ── */
function CurfdLogo({ size = 32 }: { size?: number }) {
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

/* ── Colored Google icon ── */
const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AuthPage = ({ mode = "signin" }: AuthPageProps) => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithProvider, demoLogin, isAuthenticated, isLoading, error } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === "signup";

  useEffect(() => {
    if (isAuthenticated) navigate(ROUTES.HOME);
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
    if (isSignUp && !validateName(name)) {
      setLocalError("Name must be between 2 and 50 characters");
      return;
    }
    if (!validateEmail(email)) {
      setLocalError("Please enter a valid email address");
      return;
    }
    if (isSignUp) {
      const pw = validatePassword(password);
      if (!pw.isValid) {
        setLocalError(pw.errors[0]);
        return;
      }
    } else if (password.length < 6) {
      setLocalError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name);
      } else {
        if (email === "demo@curfd.ai" && password === "Demo1234") {
          demoLogin();
        } else {
          await signIn(email, password);
        }
      }
      navigate(ROUTES.HOME);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProvider = async (provider: "google" | "github") => {
    setLocalError(null);
    try {
      await signInWithProvider(provider);
    } catch {
      setLocalError(`${provider} sign-in failed`);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm mx-4 bg-white border border-neutral-200 rounded-2xl shadow-sm p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <CurfdLogo size={36} />
        </div>

        {/* Heading */}
        <h1 className="text-xl font-semibold text-neutral-800 text-center">
          {isSignUp ? "Create account" : "Welcome back"}
        </h1>
        <p className="text-sm text-neutral-500 text-center mt-1 mb-6">
          {isSignUp ? "Start building with curfd" : "Sign in to your workspace"}
        </p>

        {/* Error */}
        {displayError && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {displayError}
          </div>
        )}

        {/* OAuth buttons */}
        <div className="space-y-2.5 mb-5">
          <button
            type="button"
            onClick={() => handleProvider("google")}
            disabled={submitting || isLoading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <GoogleIcon className="w-4 h-4" />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleProvider("github")}
            disabled={submitting || isLoading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-white text-xs text-neutral-400">or</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-neutral-600 mb-1 font-mono">
                Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-neutral-600 mb-1 font-mono">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-neutral-600 mb-1 font-mono">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full py-2.5 bg-neutral-50 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : isSignUp ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Footer link */}
        <p className="text-sm text-center mt-5 text-neutral-500">
          {isSignUp ? "Already have one? " : "New here? "}
          <Link
            to={isSignUp ? ROUTES.SIGNIN : ROUTES.SIGNUP}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </Link>
        </p>

        {/* Back to landing */}
        <div className="text-center mt-3">
          <Link to={ROUTES.LANDING} className="text-xs text-neutral-400 hover:text-neutral-600">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
