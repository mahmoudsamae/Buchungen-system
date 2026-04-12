"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ManagerDialog } from "@/components/manager/dialog";
import { useLanguage } from "@/components/i18n/language-provider";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { StatusBadge } from "@/components/shared/status-badge";

export function TeacherStudentsClient({ schoolSlug }) {
  const { t } = useLanguage();
  const base = `/teacher/${schoolSlug}`;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await teacherFetch(schoolSlug, "/api/teacher/students");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || t("teacher.students.loadError"));
      setRows([]);
    } else {
      setRows(json.students || []);
    }
    setLoading(false);
  }, [schoolSlug, t]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        (r.fullName || "").toLowerCase().includes(s) ||
        (r.email || "").toLowerCase().includes(s) ||
        (r.phone || "").includes(s)
    );
  }, [rows, q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("teacher.students.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("teacher.students.subtitle")}</p>
        </div>
        <Button type="button" className="gap-2 rounded-xl" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("teacher.students.add")}
        </Button>
      </div>

      {error ? <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">{t("common.search")}</CardTitle>
          <Input
            className="max-w-xs rounded-xl"
            placeholder={t("teacher.students.search")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("teacher.students.empty")}</p>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3">{t("teacher.students.col.name")}</th>
                  <th className="pb-2 pr-3">{t("teacher.students.col.contact")}</th>
                  <th className="pb-2 pr-3">{t("teacher.students.col.status")}</th>
                  <th className="pb-2 pr-3">{t("teacher.students.col.lastLesson")}</th>
                  <th className="pb-2 pr-3">{t("teacher.students.col.nextBooking")}</th>
                  <th className="pb-2 pr-3">{t("teacher.students.col.completed")}</th>
                  <th className="pb-2">{t("teacher.bookings.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.userId} className="border-b border-border/30">
                    <td className="py-3 pr-3 font-medium">{r.fullName || t("teacher.common.na")}</td>
                    <td className="py-3 pr-3 text-muted-foreground">
                      <div>{r.email}</div>
                      {r.phone ? <div className="text-xs">{r.phone}</div> : null}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge value={r.status} />
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground">{r.lastLesson || t("teacher.common.na")}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{r.nextBooking || t("teacher.common.na")}</td>
                    <td className="py-3 pr-3 tabular-nums">{r.completedCount}</td>
                    <td className="py-3">
                      <Link href={`${base}/students/${r.userId}`} className="text-primary hover:underline">
                        {t("teacher.students.open")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ManagerDialog open={open} onClose={() => setOpen(false)} title={t("teacher.students.add")} wide>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            setFormError("");
            const res = await teacherFetch(schoolSlug, "/api/teacher/students", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                password: form.password
              })
            });
            const json = await res.json().catch(() => ({}));
            setSaving(false);
            if (!res.ok) {
              setFormError(json.error || "Failed");
              return;
            }
            setOpen(false);
            setForm({ fullName: "", email: "", phone: "", password: "" });
            await load();
          }}
        >
          <label className="space-y-1 text-xs sm:col-span-2">
            <span>{t("teacher.students.form.name")}</span>
            <Input
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className="rounded-xl"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span>{t("teacher.students.form.email")}</span>
            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-xl"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span>{t("teacher.students.form.phone")}</span>
            <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="rounded-xl" />
          </label>
          <label className="space-y-1 text-xs sm:col-span-2">
            <span>{t("teacher.students.form.password")}</span>
            <Input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="rounded-xl"
            />
          </label>
          {formError ? <p className="sm:col-span-2 text-xs text-danger">{formError}</p> : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "…" : t("teacher.students.form.submit")}
            </Button>
          </div>
        </form>
      </ManagerDialog>
    </div>
  );
}
