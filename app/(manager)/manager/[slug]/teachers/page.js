"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

export default function TeachersPage() {
  const { business } = useManager();
  const { t } = useLanguage();
  const slug = business?.slug ?? "";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [accessTeacher, setAccessTeacher] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [insights, setInsights] = useState(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
      /** Do not clear rows on failure — keeps last good list (e.g. after a successful create if refetch fails). */
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

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || undefined,
      password: form.password
    };
    const res = await managerFetch(slug, "/api/manager/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    setSaving(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error || t("manager.teachers.addError"));
      return;
    }
    toast.success(t("manager.teachers.addSuccess"));
    setForm({ fullName: "", email: "", phone: "", password: "" });
    setError(null);
    /** Same source of truth as GET; show immediately even before refetch. */
    if (body.user?.id) {
      setRows((prev) => {
        const u = body.user;
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
    await load();
  }

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.teachers.subtitle")} />
      <main className="space-y-6 p-4 pb-10 md:p-6 md:pb-12">
        <Card>
          <CardHeader>
            <CardTitle>{t("manager.teachers.addTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("manager.teachers.addHint")}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="teacher-fullName">
                  {t("manager.teachers.field.fullName")}
                </label>
                <Input
                  id="teacher-fullName"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="teacher-email">
                  {t("manager.teachers.field.email")}
                </label>
                <Input
                  id="teacher-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="teacher-phone">
                  {t("manager.teachers.field.phone")}
                </label>
                <Input
                  id="teacher-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  autoComplete="tel"
                />
              </div>
              <div className="md:col-span-1">
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="teacher-password">
                  {t("manager.teachers.field.password")}
                </label>
                <Input
                  id="teacher-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {saving ? t("common.loading") : t("manager.teachers.submit")}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

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
              <p className="text-sm text-muted-foreground">{t("manager.teachers.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
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
                          <td className="py-3 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
                              <Link
                                href={`/manager/${slug}/teachers/${u.id}`}
                                className="text-sm font-semibold text-primary hover:underline"
                              >
                                {t("manager.teachers.viewProfile")}
                              </Link>
                              <button
                                type="button"
                                onClick={() => setAccessTeacher(u)}
                                className="text-sm font-medium text-violet-300 hover:underline"
                              >
                                {t("manager.teachers.access")}
                              </button>
                              <button
                                type="button"
                                onClick={() => resetTeacherPassword(u.id)}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
                              >
                                {t("access.sendRecovery")}
                              </button>
                              <button
                                type="button"
                                disabled={u.status !== "active"}
                                onClick={() => setDeactivateTarget(u)}
                                className="text-sm font-medium text-danger/90 hover:underline disabled:opacity-40"
                              >
                                {t("manager.teachers.deactivate")}
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
    </>
  );
}
