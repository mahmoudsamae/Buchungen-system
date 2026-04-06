"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { managerNav } from "@/lib/navigation";
import { ManagerDataProvider } from "@/components/manager/provider";
import { ManagerDesktopSidebar } from "@/components/navigation/manager-desktop-sidebar";
import { ManagerNavLinks } from "@/components/navigation/manager-nav-links";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

export function ManagerShell({ business, userId, children }) {
  const basePath = `/manager/${business.slug}`;
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(
    () => managerNav.map((item) => ({ href: item.href, label: t(item.labelKey) })),
    [t]
  );

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <ManagerDataProvider initialBusiness={business} userId={userId}>
      <div className="flex min-h-screen bg-background">
        <ManagerDesktopSidebar
          brandLabel={t("manager.shell.brand")}
          workspaceLabel={t("manager.shell.workspace")}
          businessName={business.name}
          items={navItems}
          basePath={basePath}
        />

        {/* Mobile drawer */}
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
              "absolute left-0 top-0 flex h-full w-[min(20rem,92vw)] flex-col border-r border-border/60 bg-card shadow-2xl transition-transform duration-200 ease-out",
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("manager.shell.brand")}
                </p>
                <p className="truncate text-sm font-semibold">{business.name}</p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setMobileOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <ManagerNavLinks items={navItems} basePath={basePath} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-border/60 p-4">
              <LanguageToggle className="w-full" />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-border/80 bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-muted/50"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
            >
              <Menu className="h-4 w-4 shrink-0" />
              <span className="max-w-[40vw] truncate">{business.name}</span>
            </button>
            <LanguageToggle />
          </header>

          <div className="flex-1">{children}</div>
        </div>
      </div>
    </ManagerDataProvider>
  );
}
