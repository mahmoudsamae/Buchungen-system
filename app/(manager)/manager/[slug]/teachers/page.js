"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { ChevronDown, KeyRound, Mail, UserCheck, UserRound, UserX } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/navigation/page-header";
import { useManager } from "@/components/manager/provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { managerFetch } from "@/lib/manager/manager-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { TeacherAccessModal } from "@/components/manager/teacher-access-modal";
import { ConfirmDialog } from "@/components/manager/dialog";
import { TeacherCreateModal } from "@/components/manager/teacher-create-modal";
import { Button } from "@/components/ui/button";

const listActionBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45";
const profileBtn =
  `${listActionBase} border-primary/35 bg-primary/10 text-primary hover:border-primary/55 hover:bg-primary/15 focus-visible:ring-primary/50`;
const accessBtn =
  `${listActionBase} border-violet-500/35 bg-violet-950/30 text-violet-100 hover:border-violet-400/50 hover:bg-violet-900/45 focus-visible:ring-violet-500/45`;
const recoveryBtn =
  `${listActionBase} border-border/70 bg-zinc-900/55 text-zinc-100 hover:border-border hover:bg-zinc-800/80 focus-visible:ring-zinc-400/40`;
const deactivateBtn =
  `${listActionBase} border-danger/45 bg-danger/15 text-danger hover:border-danger/60 hover:bg-danger/20 focus-visible:ring-danger/50`;
const activateBtn =
  `${listActionBase} border-emerald-500/35 bg-emerald-950/30 text-emerald-100 hover:border-emerald-400/50 hover:bg-emerald-900/45 focus-visible:ring-emerald-500/45`;
const moreBtn =
  `${listActionBase} border-border/70 bg-background/70 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground focus-visible:ring-zinc-400/40`;

export default function TeachersPage() {
  const { business } = useManager();
  const { t } = useLanguage();
  const slug = business?.slug ?? "";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [accessTeacher, setAccessTeacher] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [activateTarget, setActivateTarget] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [insights, setInsights] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const menuBtnRefs = useRef(new Map());

  const staffRows = useMemo(() => rows.filter((r) => r.role === "staff"), [rows]);

  const directoryByUserId = useMemo(() => {
    const m = new Map();
    for (const row of insights?.teacherDirectory || []) {
      m.set(row.userId, row);
    }
    return m;
  }, [insights]);

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staffRows.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (u.fullName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    });
  }, [staffRows, query, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await managerFetch(slug, "/api/manager/team");
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const serverMsg = typeof j.error === "string" && j.error.trim() ? j.error : null;
      const extra = [j.code, j.details].filter(Boolean).join(" — ");
      setError(
        serverMsg
          ? extra
            ? `${serverMsg} (${extra})`
            : serverMsg
          : t("manager.teachers.loadError")
      );
      setLoading(false);
      return;
    }
    setRows(j.users || []);
    setLoading(false);
  }, [slug, t]);

  useEffect(() => {
    if (!slug) return;
    load();
  }, [slug, load]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const res = await managerFetch(slug, "/api/manager/school-insights");
      const j = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.ok) setInsights(j);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!openMenu) return;
    const onWindowChange = () => setOpenMenu(null);
    const onDocClick = (e) => {
      const trigger = menuBtnRefs.current.get(openMenu.userId);
      if (trigger && trigger.contains(e.target)) return;
      setOpenMenu(null);
    };
    const onEscape = (e) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [openMenu]);

  async function resetTeacherPassword(userId) {
    const res = await managerFetch(slug, `/api/manager/team/${userId}/reset-password`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "Failed.");
      return;
    }
    toast.success(j.message || "Recovery email sent.");
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    const res = await managerFetch(slug, `/api/manager/team/${deactivateTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "inactive" })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "Failed.");
      return;
    }
    toast.success("Teacher deactivated.");
    setDeactivateTarget(null);
    await load();
  }

  async function confirmActivate() {
    if (!activateTarget) return;
    const res = await managerFetch(slug, `/api/manager/team/${activateTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "Failed.");
      return;
    }
    toast.success("Teacher activated.");
    setActivateTarget(null);
    await load();
  }

  function openRowMenuFor(userId, user) {
    const el = menuBtnRefs.current.get(userId);
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 180;
    const left = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    const belowTop = rect.bottom + 6;
    const aboveTop = rect.top - menuHeight - 6;
    const top = belowTop + menuHeight > window.innerHeight - 8 ? Math.max(8, aboveTop) : belowTop;
    setOpenMenu({ userId, user, left, top });
  }

  function onTeacherCreated(u) {
    if (u?.id) {
      setRows((prev) => {
        const rest = prev.filter((r) => r.id !== u.id);
        const next = [...rest, u];
        next.sort((a, b) => {
          if (a.role === "manager" && b.role !== "manager") return -1;
          if (a.role !== "manager" && b.role === "manager") return 1;
          return 0;
        });
        return next;
      });
    }
  }

  return (
    <>
      <PageHeader
        businessName={business?.name}
        subtitle={t("manager.pages.teachers.subtitle")}
        actions={
          <Button type="button" className="rounded-xl" onClick={() => setCreateOpen(true)}>
            {t("manager.teachers.createTeacher")}
          </Button>
        }
      />
      <main className="space-y-6 p-4 pb-10 md:p-6 md:pb-12">
        <Card className="rounded-2xl border-border/60 shadow-soft">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>{t("manager.teachers.listTitle")}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{t("manager.pages.teachers.subtitle")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                className="h-10 w-full min-w-[12rem] sm:w-56"
                placeholder={t("manager.teachers.searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Select className="h-10 w-full min-w-[10rem] sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">{t("manager.teachers.filterAll")}</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="suspended">suspended</option>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : staffRows.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("manager.teachers.empty")}</p>
                <Button type="button" variant="secondary" className="rounded-xl" onClick={() => setCreateOpen(true)}>
                  {t("manager.teachers.createTeacher")}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full min-w-[880px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">{t("manager.teachers.col.name")}</th>
                      <th className="pb-2 pr-3 font-medium">{t("manager.teachers.col.email")}</th>
                      <th className="pb-2 pr-3 font-medium">{t("manager.teachers.col.status")}</th>
                      <th className="pb-2 pr-3 font-medium tabular-nums">{t("manager.teachers.col.students")}</th>
                      <th className="pb-2 pr-3 font-medium tabular-nums">{t("manager.teachers.col.bookings")}</th>
                      <th className="pb-2 pr-3 font-medium">{t("manager.teachers.col.next")}</th>
                      <th className="pb-2 pr-3 font-medium tabular-nums">{t("manager.teachers.col.cancelRate")}</th>
                      <th className="pb-2 font-medium text-right">{t("manager.teachers.col.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((u) => {
                      const d = directoryByUserId.get(u.id);
                      const nextBk = d?.nextBooking;
                      const nextLabel =
                        nextBk && nextBk.date && nextBk.time ? `${nextBk.date} ${nextBk.time}` : "—";
                      return (
                        <tr key={u.id} className="border-b border-border/40">
                          <td className="py-3 pr-3 font-medium">{u.fullName || "—"}</td>
                          <td className="py-3 pr-3 text-muted-foreground">{u.email || "—"}</td>
                          <td className="py-3 pr-3">
                            <StatusBadge value={u.status} />
                          </td>
                          <td className="py-3 pr-3 tabular-nums text-muted-foreground">
                            {d != null ? d.assignedStudents : "—"}
                          </td>
                          <td className="py-3 pr-3 tabular-nums text-muted-foreground">
                            {d != null ? d.attributedBookings : "—"}
                          </td>
                          <td className="py-3 pr-3 text-xs text-muted-foreground tabular-nums">{nextLabel}</td>
                          <td className="py-3 pr-3 tabular-nums text-muted-foreground">
                            {d?.cancellationRatePct != null ? `${d.cancellationRatePct}%` : "—"}
                          </td>
                          <td className="relative py-3 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <Link
                                href={`/manager/${slug}/teachers/${u.id}`}
                                className={profileBtn}
                              >
                                <UserRound className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                                Profil
                              </Link>
                              <button
                                ref={(el) => {
                                  if (el) menuBtnRefs.current.set(u.id, el);
                                  else menuBtnRefs.current.delete(u.id);
                                }}
                                type="button"
                                onClick={() => {
                                  if (openMenu?.userId === u.id) setOpenMenu(null);
                                  else openRowMenuFor(u.id, u);
                                }}
                                className={moreBtn}
                              >
                                  More
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {rows.some((r) => r.role === "manager") ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    School administrator logins are not listed here — they manage this console.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <TeacherCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        slug={slug}
        onCreated={(u) => {
          onTeacherCreated(u);
          setError(null);
          load();
        }}
      />

      <TeacherAccessModal
        open={Boolean(accessTeacher)}
        schoolName={business?.name ?? ""}
        schoolSlug={slug}
        teacher={accessTeacher}
        onClose={() => setAccessTeacher(null)}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title={t("manager.teachers.deactivate")}
        description="This teacher will lose access until you activate them again."
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
      />

      <ConfirmDialog
        open={Boolean(activateTarget)}
        title="Activate teacher?"
        description="This teacher will regain account access and appear in active team views."
        onCancel={() => setActivateTarget(null)}
        onConfirm={confirmActivate}
      />

      {openMenu && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[120] w-56 rounded-xl border border-border/60 bg-card/95 p-1.5 text-left shadow-xl backdrop-blur"
              style={{ left: openMenu.left, top: openMenu.top }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  setAccessTeacher(openMenu.user);
                }}
                className={`${accessBtn} w-full justify-start`}
              >
                <KeyRound className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                {t("manager.teachers.access")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  resetTeacherPassword(openMenu.user.id);
                }}
                className={`${recoveryBtn} mt-1 w-full justify-start`}
              >
                <Mail className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                Send password reset email
              </button>
              {openMenu.user.status === "active" ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    setDeactivateTarget(openMenu.user);
                  }}
                  className={`${deactivateBtn} mt-1 w-full justify-start`}
                >
                  <UserX className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                  {t("manager.teachers.deactivate")}
                </button>
              ) : null}
              {openMenu.user.status === "inactive" ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    setActivateTarget(openMenu.user);
                  }}
                  className={`${activateBtn} mt-1 w-full justify-start`}
                >
                  <UserCheck className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                  Activate
                </button>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
