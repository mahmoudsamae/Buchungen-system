"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SuperAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/super-admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/super-admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password })
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Access denied.");
      return;
    }
    router.push(nextPath.startsWith("/super-admin") ? nextPath : "/super-admin");
    router.refresh();
  };

  return (
    <Card className="relative w-full max-w-md rounded-2xl border bg-card/90 p-6 shadow-card backdrop-blur">
      <h1 className="text-xl font-semibold">Platform administration</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        For platform owner or platform admin accounts. Roles are stored in{" "}
        <code className="text-xs">profiles.platform_role</code>; the legacy flag{" "}
        <code className="text-xs">is_platform_super_admin</code> is still accepted.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <label className="block text-xs text-muted-foreground">
          Email
          <Input type="email" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
        <label className="block text-xs text-muted-foreground">
          Password
          <Input type="password" className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-70"
        >
          {loading ? "Signing in…" : "Enter console"}
        </button>
      </form>
    </Card>
  );
}
