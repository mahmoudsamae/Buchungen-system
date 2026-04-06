"use client";

import { useRouter } from "next/navigation";
import { SuperAdminSidebar } from "@/components/super-admin/sidebar";

export default function SuperAdminLayout({ children }) {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/super-admin/logout", { method: "POST" });
    router.push("/super-admin-login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-background">
      <SuperAdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <p className="text-sm font-medium text-muted-foreground">Super Admin Console</p>
          <button type="button" onClick={logout} className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            Sign out
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
