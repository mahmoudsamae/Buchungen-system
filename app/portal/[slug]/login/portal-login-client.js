"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function Form() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || `/portal/${slug}/book`;
  const err = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: se } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (se || !data.user) {
        setError(se?.message || "Login failed.");
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/portal/${slug}/verify`, { method: "POST" });
      if (!res.ok) {
        await supabase.auth.signOut();
        setError("This account is not an active customer of this business.");
        setLoading(false);
        return;
      }
      router.push(nextPath.startsWith(`/portal/${slug}`) ? nextPath : `/portal/${slug}/book`);
      router.refresh();
    } catch (ex) {
      setError(ex.message || "Error");
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md space-y-4 p-6 shadow-card">
      <div>
        <h1 className="text-xl font-semibold">Customer login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Business: {slug}</p>
        {(err || error) && (
          <p className="mt-2 text-sm text-danger">
            {err === "not_a_customer" ? "You must be a customer of this business." : error || err}
          </p>
        )}
      </div>
      <form className="space-y-3" onSubmit={submit}>
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
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

export function PortalLoginClient() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <Form />
    </Suspense>
  );
}
