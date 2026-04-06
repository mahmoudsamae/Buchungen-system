"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function BusinessLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const err = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Force explicit login every time this page is opened.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signOut();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      const br = await fetch("/api/manager/business");
      let dest = "/manager/dashboard";
      if (br.ok) {
        const bj = await br.json().catch(() => ({}));
        if (bj.business?.slug) dest = `/manager/${bj.business.slug}/dashboard`;
      }
      router.push(dest);
      router.refresh();
    } catch (ex) {
      setError(ex.message || "Login failed.");
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md space-y-4 p-6 shadow-card">
      <div>
        <h1 className="text-xl font-semibold">Business login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in with your business manager credentials.</p>
      </div>
      {(err === "no_manager" || error) && (
        <p className="text-sm text-danger">{err === "no_manager" ? "No active manager membership for this account." : error}</p>
      )}
      <form className="space-y-3" onSubmit={submit}>
        <Input type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-70"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </Card>
  );
}

export function BusinessLoginClient() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <BusinessLoginForm />
    </Suspense>
  );
}
