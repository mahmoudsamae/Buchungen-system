"use client";

import { cn } from "@/lib/utils";

/**
 * Manager page header: business name as primary title, contextual subtitle.
 */
export function PageHeader({ businessName, subtitle, actions = null, className }) {
  const primary = businessName?.trim() || "Business";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/60 bg-background/90 px-4 py-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 md:px-6 md:py-5",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{primary}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
