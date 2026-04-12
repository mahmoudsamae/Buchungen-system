"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ManagerDialog } from "@/components/manager/dialog";
import { CopyLinkButton } from "@/components/access/copy-link-button";
import { QrCodeCard } from "@/components/access/qr-code-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { schoolLoginPath, withOrigin } from "@/lib/auth/tenant-login-urls";
import { useLanguage } from "@/components/i18n/language-provider";

export function SchoolAccessModal({ open, business, onClose, canMutate }) {
  const { t } = useLanguage();
  const [origin, setOrigin] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  const path = business ? schoolLoginPath(business.slug) : "";
  const absolute = useMemo(() => (origin && path ? withOrigin(origin, path) : ""), [origin, path]);

  const sendRecovery = async () => {
    if (!canMutate || !business?.id) return;
    setSending(true);
    setMsg("");
    const res = await fetch(`/api/super-admin/businesses/${business.id}/manager/send-recovery`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setMsg(typeof j.error === "string" ? j.error : "Request failed.");
      return;
    }
    setMsg(j.message || "Done.");
  };

  return (
    <ManagerDialog open={open} onClose={onClose} title={t("superAdmin.businesses.accessTitle")} wide>
      {business ? (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {t("access.role.schoolAdmin")}
              </span>
              <StatusBadge value={business.status} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{business.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{business.slug}</p>
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
            <QrCodeCard value={absolute || path} caption={t("access.schoolSection")} />
          </div>

          <div className="space-y-3 rounded-xl border border-border/50 bg-muted/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("access.managerAccount")}</p>
            <p className="text-sm text-foreground">{business.manager?.email || "—"}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Membership</span>
              <StatusBadge value={business.manager?.status || "active"} />
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href={`/super-admin/businesses/${business.id}`}
                className="inline-flex items-center justify-center rounded-lg border border-border/70 py-2 text-center text-xs font-semibold hover:bg-muted/40"
              >
                {t("access.openBusinessPage")}
              </Link>
              {canMutate ? (
                <button
                  type="button"
                  disabled={sending}
                  onClick={sendRecovery}
                  className="rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {sending ? "…" : t("access.sendRecovery")}
                </button>
              ) : null}
              {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </ManagerDialog>
  );
}
