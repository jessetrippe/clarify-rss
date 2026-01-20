"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ message?: string; error?: string }>({});

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSendLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus({});

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setStatus({ error: "Enter a valid email address." });
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus({ error: error.message });
      return;
    }

    setStatus({ message: "Magic link sent. Check your email." });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Loading...
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Clarify</h1>
          <p className="text-sm text-[var(--muted)]">
            Sign in to access your RSS feeds
          </p>
        </div>

        <form onSubmit={handleSendLink} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[var(--foreground)]" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded bg-[var(--background)] text-[var(--foreground)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent placeholder:text-[var(--muted)]"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[var(--accent)] text-white rounded text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Send magic link
          </button>
        </form>

        {status.message && (
          <div className="mt-4 p-3 text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-900 rounded">
            {status.message}
          </div>
        )}
        {status.error && (
          <div className="mt-4 p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded">
            {status.error}
          </div>
        )}

        <p className="mt-6 text-xs text-center text-[var(--muted)]">
          We&apos;ll send you a magic link to sign in without a password.
        </p>
      </div>
    </div>
  );
}
