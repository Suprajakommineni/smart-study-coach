import { useState } from "react";
import { Link } from "react-router-dom";
import { registerUser } from "../api/authapi";

type FormError = {
  email: string;
  password: string;
};

const NoError: FormError = {
  email: "",
  password: "",
};

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<FormError>(NoError);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(NoError);

    setLoading(true);
    try {
      if (!email.trim() || !password.trim()) {
        setError({
          email: !email.trim() ? "Email is required" : "",
          password: !password.trim() ? "Password is required" : "",
        });
        return;
      }
      await registerUser(email, password);
      window.location.href = "/login";
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError({
        email: message.toLowerCase().includes("email")
          ? "Email already Exists"
          : "",
        password: message.toLowerCase().includes("email") ? "" : message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Mobile-only top branding strip */}
      <div className="lg:hidden flex items-center gap-2 px-6 py-4 border-b border-gray-200">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 48 48">
            <path
              d="M24 8 L38 16 L24 24 L10 16 Z"
              fill="white"
              fillOpacity="0.95"
            />
            <path
              d="M14 20 L14 32 L24 38 L34 32 L34 20"
              stroke="white"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="font-semibold text-gray-900">Smart Study Coach</span>
      </div>

      {/* Left panel: logo top-left, headline, study concept mockup */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center border-r border-gray-200 px-16 py-12 relative">
        <div className="flex items-center gap-2 absolute top-12 left-16">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                d="M24 8 L38 16 L24 24 L10 16 Z"
                fill="white"
                fillOpacity="0.95"
              />
              <path
                d="M14 20 L14 32 L24 38 L34 32 L34 20"
                stroke="white"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-semibold text-lg text-gray-900">
            Smart Study Coach
          </span>
        </div>

        <h2 className="text-4xl font-bold text-gray-900 leading-tight mb-4 mt-16">
          Turn your notes into{" "}
          <span className="text-indigo-600">mastered concepts.</span>
        </h2>
        <p className="text-gray-500 text-lg mb-10 max-w-sm">
          Paste your notes, get AI-generated concepts and quizzes, and track
          your mastery over time.
        </p>

        <svg viewBox="0 0 480 320" className="w-full max-w-md">
          <rect
            x="0"
            y="0"
            width="480"
            height="320"
            rx="16"
            fill="#F8FAFC"
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />
          <rect x="0" y="0" width="480" height="36" rx="16" fill="#F1F5F9" />
          <circle cx="20" cy="18" r="5" fill="#EF4444" />
          <circle cx="38" cy="18" r="5" fill="#F59E0B" />
          <circle cx="56" cy="18" r="5" fill="#22C55E" />

          {/* Concept card 1 - New */}
          <rect x="20" y="56" width="136" height="14" rx="4" fill="#94A3B8" />
          <rect
            x="20"
            y="80"
            width="136"
            height="80"
            rx="10"
            fill="white"
            stroke="#E2E8F0"
          />
          <rect
            x="30"
            y="90"
            width="80"
            height="8"
            rx="4"
            fill="#94A3B8"
            fillOpacity="0.7"
          />
          <rect x="30" y="104" width="100" height="6" rx="3" fill="#CBD5E1" />
          <rect x="30" y="116" width="90" height="6" rx="3" fill="#CBD5E1" />
          <rect
            x="30"
            y="134"
            width="60"
            height="16"
            rx="8"
            fill="#94A3B8"
            fillOpacity="0.15"
          />

          {/* Concept card 2 - Learning */}
          <rect x="172" y="56" width="136" height="14" rx="4" fill="#94A3B8" />
          <rect
            x="172"
            y="80"
            width="136"
            height="80"
            rx="10"
            fill="white"
            stroke="#E2E8F0"
          />
          <rect
            x="182"
            y="90"
            width="90"
            height="8"
            rx="4"
            fill="#F59E0B"
            fillOpacity="0.7"
          />
          <rect x="182" y="104" width="70" height="6" rx="3" fill="#CBD5E1" />
          <rect x="182" y="116" width="100" height="6" rx="3" fill="#CBD5E1" />
          <rect
            x="182"
            y="134"
            width="70"
            height="16"
            rx="8"
            fill="#F59E0B"
            fillOpacity="0.15"
          />

          {/* Concept card 3 - Mastered, with quiz check */}
          <rect x="324" y="56" width="136" height="14" rx="4" fill="#94A3B8" />
          <rect
            x="324"
            y="80"
            width="136"
            height="80"
            rx="10"
            fill="white"
            stroke="#E2E8F0"
          />
          <path
            d="M336 100 L344 108 L358 92"
            stroke="#22C55E"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="368"
            y="94"
            width="70"
            height="8"
            rx="4"
            fill="#94A3B8"
            fillOpacity="0.5"
          />
          <rect x="330" y="116" width="100" height="6" rx="3" fill="#CBD5E1" />
          <rect
            x="330"
            y="134"
            width="72"
            height="16"
            rx="8"
            fill="#22C55E"
            fillOpacity="0.15"
          />

          {/* Mastery progress bar */}
          <rect x="20" y="230" width="440" height="10" rx="5" fill="#E2E8F0" />
          <rect x="20" y="230" width="290" height="10" rx="5" fill="#4F46E5" />
          <rect x="20" y="252" width="150" height="8" rx="4" fill="#94A3B8" />
        </svg>
      </div>

      {/* Right panel: form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-6 sm:px-8 sm:py-8 overflow-y-auto">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Create your account
          </h1>
          <p className="text-gray-500 mt-2 mb-8 text-sm sm:text-base">
            Start turning your notes into a personal study system.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Email address"
              />
              {error.email && (
                <p className="text-red-600 text-sm mt-1">{error.email}</p>
              )}
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Password"
              />

              {error.password && (
                <p className="text-red-600 text-sm mt-1">{error.password}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-indigo-600 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
