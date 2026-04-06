"use client";

import { useState } from "react";
import { Settings2, UserRound, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { DEMO_MANAGER, DEMO_CUSTOMER } from "@/lib/demo/demo-credentials";
import { resolveDemoCustomerPortalBookPath } from "@/lib/demo/resolve-customer-portal";

const roles = [
  {
    id: "customer",
    icon: UserRound,
    title: "Book an Appointment",
    description: "I want to book a time slot quickly and easily",
    cta: "Continue as Customer"
  },
  {
    id: "manager",
    icon: Settings2,
    title: "Manage Bookings",
    description: "I want to manage availability and bookings for my business",
    cta: "Continue as Business"
  }
];

export default function ChooseRolePage() {
  const [loadingRole, setLoadingRole] = useState(null);
  const [error, setError] = useState("");

  const handleRoleSelect = async (role) => {
    setError("");
    setLoadingRole(role);

    let supabase;
    try {
      supabase = createClient();
    } catch (e) {
      setError(e?.message || "Missing Supabase configuration (env vars).");
      setLoadingRole(null);
      return;
    }

    await supabase.auth.signOut();

    try {
      if (role === "manager") {
        const { data, error: signErr } = await supabase.auth.signInWithPassword({
          email: DEMO_MANAGER.email,
          password: DEMO_MANAGER.password
        });

        if (signErr) {
          setError(`Business demo sign-in failed: ${signErr.message}`);
          setLoadingRole(null);
          return;
        }
        if (!data?.session) {
          setError("Business demo sign-in returned no session. Check Supabase Auth settings.");
          setLoadingRole(null);
          return;
        }

        window.location.assign("/manager/dashboard");
        return;
      }

      if (role === "customer") {
        const { data, error: signErr } = await supabase.auth.signInWithPassword({
          email: DEMO_CUSTOMER.email,
          password: DEMO_CUSTOMER.password
        });

        if (signErr) {
          setError(`Customer demo sign-in failed: ${signErr.message}`);
          setLoadingRole(null);
          return;
        }
        if (!data?.session || !data.user?.id) {
          setError("Customer demo sign-in returned no session. Check Supabase Auth settings.");
          setLoadingRole(null);
          return;
        }

        const path = await resolveDemoCustomerPortalBookPath(supabase, data.user.id);
        if (!path) {
          setError(
            "Could not find the demo business for this customer. Link demouser in business_users or set NEXT_PUBLIC_DEMO_BUSINESS_SLUG in .env.local."
          );
          await supabase.auth.signOut();
          setLoadingRole(null);
          return;
        }

        window.location.assign(path);
        return;
      }
    } catch (e) {
      setError(e?.message || "Unexpected error during demo sign-in.");
      setLoadingRole(null);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute -top-10 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/35 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-info/25 blur-[120px]" />

      <section className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Demo Access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">How do you want to use the demo?</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            One tap signs you into the matching demo account — no email or password to type here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {roles.map((role) => {
            const Icon = role.icon;
            const busy = loadingRole === role.id;
            return (
              <Card
                key={role.id}
                className="rounded-2xl border bg-card/85 p-6 shadow-soft backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-card"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-semibold">{role.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{role.description}</p>
                <button
                  type="button"
                  disabled={loadingRole !== null}
                  onClick={() => handleRoleSelect(role.id)}
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-primary to-info text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    role.cta
                  )}
                </button>
              </Card>
            );
          })}
        </div>

        {error ? (
          <p className="mx-auto mt-6 max-w-xl rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-center text-sm text-danger">{error}</p>
        ) : null}
      </section>
    </main>
  );
}
