"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function safeNextPath(next, slugFallback) {
  const n = typeof next === "string" ? next.trim() : "";
  if (n.startsWith("/student/") && !n.includes("..")) return n;
  if (slugFallback) return `/student/${slugFallback}`;
  return "/";
}

function Form() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const nextParam = searchParams.get("next") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <Card className="w-full max-w-md space-y-4 p-6 shadow-card">
        <p className="text-sm text-danger">Missing access link. Open the link from your instructor or QR code.</p>
      </Card>
    );
  }

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
      const res = await fetch("/api/student-access/verify-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "This account does not match this access link.");
        setLoading(false);
        return;
      }
      const slug = j.slug;
      const dest = safeNextPath(nextParam, slug);
      router.push(dest);
      router.refresh();
    } catch (ex) {
      setError(ex.message || "Error");
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md space-y-4 p-6 shadow-card">
      <div>
        <h1 className="text-xl font-semibold">Student sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use the email address your school registered for you.</p>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </div>
      <form className="space-y-3" onSubmit={submit}>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
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

export function StudentAccessLoginClient() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <Form />
    </Suspense>
  );
}
