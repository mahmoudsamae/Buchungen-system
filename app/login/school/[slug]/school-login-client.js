"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { RoleLoginShell } from "@/components/auth/role-login-shell";
import { platformOwnerLoginPath, teacherLoginPath } from "@/lib/auth/tenant-login-urls";

function Form({ slug }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qpErr = searchParams.get("error");

  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const slugNorm = useMemo(() => String(slug || "").trim().toLowerCase(), [slug]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.signOut();
  }, []);

  useEffect(() => {
    if (!slugNorm) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/public/school-by-slug/${encodeURIComponent(slugNorm)}`);
      if (!res.ok) {
        if (!cancelled) setMetaError(res.status === 404 ? "School not found." : "Could not load school.");
        return;
      }
      const j = await res.json();
      if (!cancelled) {
        setMeta(j);
        setMetaError("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slugNorm]);

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
        body: JSON.stringify({ slug: slugNorm, role: "manager" })
      });
      const vj = await vr.json().catch(() => ({}));
      if (!vr.ok) {
        await supabase.auth.signOut();
        setError(typeof vj.error === "string" ? vj.error : "This account is not the school administrator for this link.");
        setLoading(false);
        return;
      }
      if (vj.redirect) {
        router.push(vj.redirect);
        router.refresh();
      }
    } catch (ex) {
      setError(ex.message || "Login failed.");
    }
    setLoading(false);
  };

  const errMsg =
    qpErr === "no_staff"
      ? null
      : qpErr === "unknown_business"
        ? "Unknown school."
        : qpErr
          ? "Sign-in was not valid for this page."
          : null;

  return (
    <RoleLoginShell
      eyebrow="BookFlow"
      title={meta?.name || "School sign-in"}
      badge="School admin"
      description={
        metaError
          ? metaError
          : "Use your school administrator email and password. This page is scoped to one school only."
      }
    >
      {(meta?.status === "suspended" || meta?.status === "inactive") && !metaError ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          This school is {meta.status}. You may be unable to sign in until the platform activates it.
        </p>
      ) : null}
      {(error || errMsg) && (
        <p className="text-sm text-destructive">{error || errMsg}</p>
      )}
      <form className="space-y-3" onSubmit={submit}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="School admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={Boolean(metaError)}
        />
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={Boolean(metaError)}
        />
        <button
          type="submit"
          disabled={loading || Boolean(metaError)}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in to school dashboard"}
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        <Link href={teacherLoginPath(slugNorm)} className="font-medium text-primary underline-offset-4 hover:underline">
          Teacher login (this school)
        </Link>
        {" · "}
        <Link href={platformOwnerLoginPath()} className="font-medium text-primary underline-offset-4 hover:underline">
          Platform sign-in
        </Link>
      </p>
    </RoleLoginShell>
  );
}

export function SchoolLoginClient({ slug }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <Form slug={slug} />
    </Suspense>
  );
}
