"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { teacherNav } from "@/lib/teacher/nav";
import { cn } from "@/lib/utils";

export function TeacherShell({ business, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const base = `/teacher/${business.slug}`;
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(() => teacherNav.map((item) => ({ href: item.href, label: t(item.labelKey) })), [t]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/login/teacher/${business.slug}`);
    router.refresh();
  };

  const NavLinks = ({ onNavigate }) => (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const href = `${base}${item.href}`;
        const active = pathname === href || (item.href !== "/dashboard" && pathname.startsWith(`${href}/`));
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

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-background">
      <aside className="hidden h-full w-64 shrink-0 flex-col overflow-y-auto border-r border-border/60 bg-card/35 lg:flex">
        <div className="flex flex-1 flex-col gap-6 p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{t("teacher.shell.brand")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("teacher.shell.workspace")}</p>
            <h2 className="mt-2 truncate text-lg font-semibold leading-tight tracking-tight">{business.name}</h2>
          </div>
          <NavLinks />
        </div>
        <div className="border-t border-border/60 p-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t("common.language")}</p>
          <LanguageToggle />
        </div>
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-[10050] lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
        <div
          className={cn(
            "absolute left-0 top-0 flex h-full w-[min(20rem,92vw)] flex-col border-r border-border/60 bg-card shadow-2xl transition-transform duration-200",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <span className="truncate text-sm font-semibold">{business.name}</span>
            <button type="button" className="rounded-lg p-2 text-muted-foreground hover:bg-muted" onClick={() => setMobileOpen(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="border-t border-border/60 p-4">
            <LanguageToggle className="w-full" />
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/60 bg-zinc-950/90 px-4 py-3 backdrop-blur-md md:px-6">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-sm font-medium shadow-sm lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-expanded={mobileOpen}
          >
            <Menu className="h-4 w-4 shrink-0" />
            <span className="max-w-[40vw] truncate">{business.name}</span>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle className="hidden sm:flex" />
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              {t("teacher.shell.signOut")}
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
