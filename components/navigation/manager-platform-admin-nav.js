"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useManager } from "@/components/manager/provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

export function ManagerPlatformAdminNav({ className }) {
  const { platformAccess } = useManager();
  const { t } = useLanguage();
  if (!platformAccess?.canAccessPlatformAdmin) return null;
  const href = platformAccess?.isPlatformOwner ? "/super-admin/owner" : "/super-admin";
  return (
    <div className={cn("border-t border-border/60 pt-4", className)}>
      <Link
        href={href}
        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/80 hover:text-foreground"
      >
        <LayoutDashboard className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        {t("manager.shell.platformAdmin")}
      </Link>
    </div>
  );
}
