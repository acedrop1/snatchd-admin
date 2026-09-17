"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Admin portal sign-in. No self-signup: access is granted by the admin claim,
// and the only account that has it today signs in with Google.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    // Force a fresh token so a newly granted admin claim is on it
    await auth.currentUser?.getIdToken(true);
    router.push("/dashboard");
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      await finish();
    } catch (e: any) {
      setError(e.message || "Google sign-in failed");
    } finally { setLoading(false); }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await finish();
    } catch (e: any) {
      setError("Email or password is wrong, or this account uses Google sign-in.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Snatchd Admin</h1>
          <p className="mt-2 text-sm text-neutral-400">Operations portal</p>
        </div>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-neutral-200 transition disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.5 13.3l7.9 6.1C12.3 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.5 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.7-4.1-13.6-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <div className="h-px flex-1 bg-white/10" /> or <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-md border border-white/10 bg-neutral-900/50 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none"
          />
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border border-white/10 bg-neutral-900/50 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-white/30 focus:outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-md border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5 transition disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in with email"}
          </button>
        </form>

        <p className="text-center text-xs text-neutral-500">Access is by invitation. Ask Adam to add you.</p>
      </div>
    </div>
  );
}
