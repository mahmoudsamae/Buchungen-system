"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { RoleLoginShell } from "@/components/auth/role-login-shell";
import { platformOwnerLoginPath } from "@/lib/auth/tenant-login-urls";

export default function GeneralSchoolLoginPage() {
  const router = useRouter();
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      const vr = await fetch("/api/auth/tenant-login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "manager" })
      });
      const vj = await vr.json().catch(() => ({}));
      if (!vr.ok) {
        await supabase.auth.signOut();
        setError(typeof vj.error === "string" ? vj.error : "This account is not the school administrator for this school.");
        setLoading(false);
        return;
      }
      if (vj.redirect) {
        router.push(vj.redirect);
        router.refresh();
        return;
      }
    } catch (ex) {
      setError(ex.message || "Login failed.");
    }
    setLoading(false);
  };

  return (
    <RoleLoginShell
      eyebrow="BookFlow"
      title="School Login"
      badge="School admin"
      description="General login for school accounts. Use your administrator credentials."
    >
      <div className="rounded-md border border-primary/35 bg-primary/10 px-3 py-2 text-xs text-primary-foreground/90">
        <p className="font-semibold text-primary">Demo credentials</p>
        <p className="mt-1">
          Email: <span className="font-mono">demo@gmail.com</span>
        </p>
        <p>
          Password: <span className="font-mono">Demo123456</span>
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <form className="space-y-3" onSubmit={submit}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="School admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
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
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in to school dashboard"}
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        <Link href={platformOwnerLoginPath()} className="font-medium text-primary underline-offset-4 hover:underline">
          Platform Login
        </Link>
      </p>
    </RoleLoginShell>
  );
}
