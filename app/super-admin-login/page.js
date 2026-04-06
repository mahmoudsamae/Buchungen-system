import { Suspense } from "react";
import { SuperAdminLoginForm } from "./super-admin-login-form";

export default function SuperAdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-info/15" />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <SuperAdminLoginForm />
      </Suspense>
    </main>
  );
}
