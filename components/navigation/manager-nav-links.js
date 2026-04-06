"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ManagerNavLinks({ items, basePath, onNavigate }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const href = `${basePath}${item.href}`;
        const active =
          pathname === href || (item.href !== "/dashboard" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={item.href}
            href={href}
            onClick={() => onNavigate?.()}
            className={cn(
              "block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground",
              active && "bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/20"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
