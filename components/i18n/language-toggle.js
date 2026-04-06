"use client";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";

export function LanguageToggle({ className }) {
  const { locale, setLocale, t } = useLanguage();
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-border/80 bg-muted/30 p-0.5 text-xs font-medium",
        className
      )}
      role="group"
      aria-label={t("common.language")}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "rounded-md px-2.5 py-1 transition",
          locale === "en" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("de")}
        className={cn(
          "rounded-md px-2.5 py-1 transition",
          locale === "de" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
        )}
      >
        DE
      </button>
    </div>
  );
}
