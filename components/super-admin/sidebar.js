"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function isActive(pathname, item) {
  if (item.match === "exact") return pathname === item.href;
  if (item.match === "owner-overview") return pathname === "/super-admin/owner";
  if (item.match === "prefix") return pathname.startsWith(item.href);
  return false;
}

export function SuperAdminSidebar() {
  const pathname = usePathname();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/super-admin/session");
      if (!res.ok || cancelled) return;
      const data = await res.json().catch(() => ({}));
      if (!cancelled) setIsOwner(Boolean(data.isPlatformOwner));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => {
    const list = [{ href: "/super-admin", label: "Dashboard", match: "exact" }];
    if (isOwner) {
      list.push({ href: "/super-admin/owner", label: "Command center", match: "owner-overview" });
      list.push({ href: "/super-admin/owner/admins", label: "Platform admins", match: "prefix" });
    }
    list.push({ href: "/super-admin/businesses", label: "Businesses", match: "prefix" });
    return list;
  }, [isOwner]);

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card p-4 lg:block">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Internal</p>
        <h2 className="text-lg font-semibold">Platform console</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {isOwner ? "Signed in as platform owner" : "Signed in as platform admin (read-only tenant tools)"}
        </p>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={cn(
              "block rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
              isActive(pathname, item) && "bg-muted text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
