"use client";

import Link from "next/link";
import { managerSetupLinks } from "@/lib/navigation";
import { useLanguage } from "@/components/i18n/language-provider";

export function SchoolSettingsSetupLinks({ basePath }) {
  const { t } = useLanguage();
  return (
    <div className="mt-10 rounded-2xl border border-border/50 bg-muted/10 p-5 shadow-soft">
      <h2 className="text-sm font-semibold text-foreground">{t("manager.settings.setupTitle")}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("manager.settings.setupHint")}</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {managerSetupLinks.map((item) => (
          <li key={item.href}>
            <Link
              href={`${basePath}${item.href}`}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm font-medium transition hover:border-primary/30 hover:bg-muted/30"
            >
              {t(item.labelKey)}
              <span aria-hidden className="text-muted-foreground">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
