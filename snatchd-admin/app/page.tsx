"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false); // Toggle state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // Success - Redirect to Dashboard or saved redirect URL
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect") || "/dashboard";
      router.push(redirect);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white selection:bg-neutral-700">
      <div className="w-full max-w-sm space-y-6 p-8">

        {/* Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isSignUp ? "Initialize Admin" : "Snatchd Mission Control"}
          </h1>
          <p className="text-sm text-neutral-400">
            {isSignUp ? "Create a new secure root access account." : "Enter your secure credentials to access the mainframe."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <input
              type="email"
              placeholder="Admin Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-all"
            />
            <input
              type="password"
              placeholder="Secure Key"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-all"
            />
          </div>

          {error && (
            <div className="text-xs text-red-500 text-center font-medium bg-red-500/10 py-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              isSignUp ? "Create Account" : "Authenticate"
            )}
          </button>
        </form>

        <div className="text-center text-xs text-neutral-600">
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="hover:text-white underline transition-colors">
            {isSignUp ? "Already have access? Login" : "Need access? Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
