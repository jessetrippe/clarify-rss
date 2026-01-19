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
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Sign in to Clarify</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          We will send you a magic link to access your account.
        </p>

        <form onSubmit={handleSendLink} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700"
          >
            Send magic link
          </button>
        </form>

        {status.message && (
          <div className="mt-4 text-sm text-green-700 dark:text-green-300">
            {status.message}
          </div>
        )}
        {status.error && (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400">
            {status.error}
          </div>
        )}
      </div>
    </div>
  );
}
