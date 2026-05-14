"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/config";
import { BigButton } from "@/components/ui/BigButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartPulse, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Incorrect email or password. Please try again.");
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-600 px-6 py-10 text-white text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-white rounded-full p-4">
            <FontAwesomeIcon icon={faHeartPulse} className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-1">{APP_NAME}</h1>
        <p className="text-blue-100 text-lg">Your health companion</p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
        <p className="text-gray-500 mb-8 text-lg">Please sign in to continue.</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          {/* Email */}
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-lg font-semibold text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-lg
                         focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         placeholder:text-gray-400 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-lg font-semibold text-gray-700">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 pr-14 text-lg
                           focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                           placeholder:text-gray-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword
                  ? <FontAwesomeIcon icon={faEyeSlash} className="w-6 h-6" />
                  : <FontAwesomeIcon icon={faEye} className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-700 text-base font-medium">{error}</p>
            </div>
          )}

          {/* Submit */}
          <BigButton
            type="submit"
            variant="primary"
            size="xl"
            fullWidth
            disabled={loading}
            className="mt-2"
          >
            {loading ? "Signing in…" : "Sign in"}
          </BigButton>
        </form>

        <p className="text-center text-gray-500 text-lg mt-8">
          New to {APP_NAME}?{" "}
          <Link href="/register" className="text-blue-600 font-semibold underline">
            Create account
          </Link>
        </p>

        <p className="text-center text-gray-400 text-base mt-4">
          Need help? Contact your caregiver.
        </p>
      </div>
    </div>
  );
}
