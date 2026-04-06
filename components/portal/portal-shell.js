"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/i18n/language-provider";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { cn } from "@/lib/utils";
import { CalendarDays, LayoutGrid, UserRound } from "lucide-react";

export function PortalShell({ slug, children }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState("");

  const isLogin = pathname?.includes("/login");

  useEffect(() => {
    if (isLogin) return;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
        setDisplayName(data?.full_name?.trim() || user.email?.split("@")[0] || "");
      } catch {
        /* ignore */
      }
    })();
  }, [isLogin, slug]);

  if (isLogin) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const base = `/portal/${slug}`;
  const links = [
    { href: `${base}/book`, label: t("portal.nav.book"), icon: LayoutGrid },
    { href: `${base}/appointments`, label: t("portal.nav.appointments"), icon: CalendarDays },
    { href: `${base}/profile`, label: t("portal.nav.profile"), icon: UserRound }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{t("portal.nav.brand")}</p>
            {displayName ? (
              <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                {t("portal.welcome")}, <span className="text-foreground">{displayName}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">{t("common.loading")}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle />
          </div>
        </div>
        <nav className="border-t border-border/40 bg-muted/20">
          <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-2 py-2 sm:px-4">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname?.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-card text-foreground shadow-sm ring-1 ring-primary/25"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 opacity-80" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <div className="mx-auto max-w-4xl">{children}</div>
    </div>
  );
}
