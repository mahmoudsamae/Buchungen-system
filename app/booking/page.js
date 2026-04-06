"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy mock booking UI — demo customers use the real portal at `/portal/[slug]/book`. */
export default function LegacyBookingRedirectPage() {
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
