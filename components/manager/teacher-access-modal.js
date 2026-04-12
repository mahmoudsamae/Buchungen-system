"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ManagerDialog } from "@/components/manager/dialog";
import { CopyLinkButton } from "@/components/access/copy-link-button";
import { QrCodeCard } from "@/components/access/qr-code-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { teacherLoginPath, withOrigin } from "@/lib/auth/tenant-login-urls";
import { managerFetch } from "@/lib/manager/manager-fetch";
import { useLanguage } from "@/components/i18n/language-provider";

export function TeacherAccessModal({ open, schoolName, schoolSlug, teacher, onClose }) {
  const { t } = useLanguage();
  const [origin, setOrigin] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const path = schoolSlug ? teacherLoginPath(schoolSlug) : "";
  const absolute = useMemo(() => (origin && path ? withOrigin(origin, path) : ""), [origin, path]);

  const sendRecovery = async () => {
    if (!teacher?.id || !schoolSlug) return;
    setSending(true);
    const res = await managerFetch(schoolSlug, `/api/manager/team/${teacher.id}/reset-password`, { method: "POST" });
    setSending(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(typeof j.error === "string" ? j.error : "Could not send email.");
      return;
    }
    toast.success(j.message || "Recovery email sent when SMTP is configured.");
  };

  return (
    <ManagerDialog open={open} onClose={onClose} title={t("access.teacherModalTitle")} wide>
      {teacher && schoolSlug ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-violet-500/35 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                {t("access.role.teacher")}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{teacher.fullName || "—"}</p>
              <p className="text-xs text-muted-foreground">{schoolName}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{schoolSlug}</p>
            </div>
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("access.loginUrl")}</p>
              <p className="break-all rounded-lg border border-border/60 bg-muted/20 px-3 py-2 font-mono text-[11px] text-foreground">{absolute || path}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyLinkButton text={absolute || path} label={t("access.copy")} copiedLabel={t("access.copied")} />
              <a
                href={absolute || path}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-3 text-xs font-semibold text-foreground hover:bg-muted/50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("access.open")}
              </a>
            </div>
            <QrCodeCard value={absolute || path} caption={t("access.teacherSection")} />
          </div>

          <div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("access.teacherAccount")}</p>
            <p className="text-sm text-foreground">{teacher.email || "—"}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <StatusBadge value={teacher.status} />
            </div>
            <button
              type="button"
              disabled={sending}
              onClick={sendRecovery}
              className="w-full rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {sending ? "…" : t("access.sendRecovery")}
            </button>
          </div>
        </div>
      ) : null}
    </ManagerDialog>
  );
}
