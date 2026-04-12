"use client";

import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useLanguage } from "@/components/i18n/language-provider";
import { ManagerNavLinks } from "@/components/navigation/manager-nav-links";
import { ManagerPlatformAdminNav } from "@/components/navigation/manager-platform-admin-nav";

export function ManagerDesktopSidebar({ brandLabel, workspaceLabel, businessName, items, basePath }) {
  const { t } = useLanguage();
  return (
    <aside className="hidden h-full min-h-0 w-64 shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-border/60 bg-card/40 lg:flex">
      <div className="flex min-h-0 flex-1 flex-col gap-6 p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{brandLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">{workspaceLabel}</p>
          <h2 className="mt-2 truncate text-lg font-semibold leading-tight tracking-tight">{businessName}</h2>
        </div>
        <ManagerNavLinks items={items} basePath={basePath} />
        <ManagerPlatformAdminNav />
      </div>
      <div className="border-t border-border/60 p-4">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{t("common.language")}</p>
        <LanguageToggle />
      </div>
    </aside>
  );
}
