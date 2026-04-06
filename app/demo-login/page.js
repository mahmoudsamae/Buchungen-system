"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL: demo sign-in now happens on `/choose-role` with fixed Supabase accounts. */
export default function DemoLoginRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/choose-role");
  }, [router]);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Redirecting to Demo Access…</p>
    </main>
  );
}
