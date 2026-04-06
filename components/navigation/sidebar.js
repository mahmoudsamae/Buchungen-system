"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({ title, items, basePath = "" }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card p-4 lg:block">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">BookFlow</p>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={`${basePath}${item.href}`}
            className={cn(
              "block rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
              (pathname === `${basePath}${item.href}` || pathname.startsWith(`${basePath}${item.href}/`)) &&
                "bg-muted text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
