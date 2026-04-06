"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/super-admin", label: "Dashboard", match: "exact" },
  { href: "/super-admin/businesses", label: "Businesses", match: "prefix" }
];

function isActive(pathname, item) {
  if (item.match === "exact") return pathname === item.href;
  return pathname.startsWith(item.href);
}

export function SuperAdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card p-4 lg:block">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Internal</p>
        <h2 className="text-lg font-semibold">Super Admin</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">Platform owner access</p>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
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
