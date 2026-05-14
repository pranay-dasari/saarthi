"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/config";
import { BigButton } from "@/components/ui/BigButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartPulse, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match. Please check and try again.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      // AuthApiError carries an HTTP status; cast because the base AuthError type omits it.
      const status = (signUpError as { status?: number }).status;

      if (status === 429 || msg.includes("rate limit") || msg.includes("too many requests")) {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("user already")
      ) {
        setError("An account with this email already exists. Please sign in instead.");
      } else if (msg.includes("weak password") || msg.includes("password should")) {
        setError("Password must be at least 6 characters.");
      } else if (
        msg === "invalid email" ||
        msg.includes("invalid email format") ||
        msg.includes("email address is invalid") ||
        msg.includes("unable to validate email")
      ) {
        // Only show this for genuine format errors, not for every message that
        // mentions the word "email" (e.g. "Email signups are disabled").
        setError("Please enter a valid email address.");
      } else {
        // Surface the real Supabase message so the user (and developer) can
        // understand what went wrong instead of seeing a generic fallback.
        setError(signUpError.message || "Could not create account. Please try again.");
      }
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Signup failed. Please try again.");
      setLoading(false);
      return;
    }

    // Create the starter profile row. Non-fatal if it fails — user can
    // complete their profile from the Profile tab after login.
    await supabase.from("profiles").insert({
      user_id: data.user.id,
      name: name.trim(),
      age: null,
      gender: null,
      conditions: [],
      doctor_phone: null,
    });

    if (data.session) {
      // Email confirmation disabled — session is active immediately.
      // Send new users to onboarding to collect profile details + medicines.
      router.push("/onboarding");
      router.refresh();
    } else {
      // Email confirmation required before login.
      setConfirmSent(true);
      setLoading(false);
    }
  };

  if (confirmSent) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <div className="bg-blue-600 px-6 py-10 text-white text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full p-4">
              <FontAwesomeIcon icon={faHeartPulse} className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-1">{APP_NAME}</h1>
        </div>
        <div className="flex-1 px-6 py-10 flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            We sent a confirmation link to <strong>{email}</strong>. Please open it to
            activate your account, then sign in.
          </p>
          <Link
            href="/login"
            className="mt-4 text-center text-blue-600 text-lg font-semibold underline"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create account</h2>
        <p className="text-gray-500 mb-8 text-lg">Fill in your details to get started.</p>

        <form onSubmit={handleRegister} className="flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-lg font-semibold text-gray-700">
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Ramesh Kumar"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-lg
                         focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         placeholder:text-gray-400 transition-colors"
            />
          </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
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
                <FontAwesomeIcon
                  icon={showPassword ? faEyeSlash : faEye}
                  className="w-6 h-6"
                />
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-2">
            <label htmlFor="confirm" className="text-lg font-semibold text-gray-700">
              Confirm password
            </label>
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Re-enter your password"
              className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-lg
                         focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                         placeholder:text-gray-400 transition-colors"
            />
          </div>

          {/* Error */}
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
            {loading ? "Creating account…" : "Create account"}
          </BigButton>
        </form>

        <p className="text-center text-gray-500 text-lg mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 font-semibold underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
