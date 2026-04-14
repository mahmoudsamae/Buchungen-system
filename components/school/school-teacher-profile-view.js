"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Mail, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { SchoolKpiCard } from "@/components/school/school-kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { TeacherAccessModal } from "@/components/manager/teacher-access-modal";
import { ConfirmDialog, ManagerDialog } from "@/components/manager/dialog";
import { useLanguage } from "@/components/i18n/language-provider";
import { managerFetch } from "@/lib/manager/manager-fetch";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SchoolTeacherManagementPanel } from "@/components/school/school-teacher-management-panel";
import { SchoolTeacherServicesTab } from "@/components/school/school-teacher-services-tab";

const TABS = ["overview", "profile", "management", "services", "students", "bookings", "calendar", "availability", "analytics"];
const actionBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45";
const accessBtn =
  `${actionBase} border-violet-500/35 bg-violet-950/30 text-violet-100 hover:border-violet-400/50 hover:bg-violet-900/45 focus-visible:ring-violet-500/45`;
const recoveryBtn =
  `${actionBase} border-border/70 bg-zinc-900/55 text-zinc-100 hover:border-border hover:bg-zinc-800/80 focus-visible:ring-zinc-400/40`;
const deactivateBtn =
  `${actionBase} border-danger/45 bg-danger/15 text-danger hover:border-danger/60 hover:bg-danger/20 focus-visible:ring-danger/50`;
const activateBtn =
  `${actionBase} border-emerald-500/35 bg-emerald-950/30 text-emerald-100 hover:border-emerald-400/50 hover:bg-emerald-900/45 focus-visible:ring-emerald-500/45`;

export function SchoolTeacherProfileView({ slug, userId, businessName, data, error, loading, onReload, onTeacherDetailUpdate }) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabRaw = searchParams.get("tab") || "overview";
  const tab = TABS.includes(tabRaw) ? tabRaw : "overview";

  const [accessOpen, setAccessOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [acting, setActing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [passwordError, setPasswordError] = useState("");
  const [coreSaving, setCoreSaving] = useState(false);
  const [core, setCore] = useState({
    fullName: "",
    email: "",
    phone: "",
    title: "",
    status: "active"
  });

  const setTab = useCallback(
    (next) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", next);
      router.push(`?${p.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const name = data?.profile?.full_name || data?.profile?.email || "Teacher";
  const isStaff = data?.membership?.role === "staff";

  useEffect(() => {
    if (!data) return;
    setCore({
      fullName: data.profile?.full_name || "",
      email: data.profile?.email || "",
      phone: data.profile?.phone || "",
      title: data.staffExtension?.title || "",
      status: data.membership?.status || "active"
    });
  }, [data]);

  const resetPassword = async () => {
    if (!slug || !userId) return;
    setActing(true);
    const res = await managerFetch(slug, `/api/manager/team/${userId}/reset-password`, { method: "POST" });
    setActing(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "Failed.");
      return;
    }
    toast.success(j.message || "Email sent.");
  };

  const deactivate = async () => {
    if (!slug || !userId) return;
    setActing(true);
    const res = await managerFetch(slug, `/api/manager/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "inactive" })
    });
    setActing(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error || "Failed.");
      return;
    }
    toast.success("Teacher deactivated.");
    setDeactivateOpen(false);
    onReload();
  };

  const activate = async () => {
    if (!slug || !userId) return;
    setActing(true);
    const res = await managerFetch(slug, `/api/manager/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" })
    });
    setActing(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error || "Failed.");
      return;
    }
    toast.success("Teacher activated.");
    setActivateOpen(false);
    onReload();
  };

  const saveCore = async () => {
    if (!slug || !userId) return;
    setCoreSaving(true);
    const res = await managerFetch(slug, `/api/manager/teachers/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: core.fullName.trim(),
        email: core.email.trim(),
        phone: core.phone.trim(),
        title: core.title.trim() || null,
        status: core.status
      })
    });
    setCoreSaving(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "Could not save teacher profile.");
      return;
    }
    toast.success("Teacher profile updated.");
    onReload();
  };

  const savePassword = async () => {
    const password = String(passwordForm.password || "");
    const confirm = String(passwordForm.confirm || "");
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError("");
    setPasswordSaving(true);
    const res = await managerFetch(slug, `/api/manager/team/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    setPasswordSaving(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPasswordError(j.error || "Could not update password.");
      return;
    }
    toast.success("Teacher password updated.");
    setPasswordOpen(false);
    setPasswordForm({ password: "", confirm: "" });
  };

  const bookingsByDate = useMemo(() => {
    if (!data?.bookings?.length) return [];
    const map = new Map();
    for (const b of data.bookings) {
      const d = b.date;
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(b);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, rows]) => ({
        date,
        rows: rows.sort((a, b) => a.time.localeCompare(b.time))
      }));
  }, [data?.bookings]);

  const analyticsBars = useMemo(() => {
    if (!data?.bookings?.length) return [];
    const counts = { completed: 0, cancelled: 0, pipeline: 0 };
    for (const b of data.bookings) {
      const st = normalizeBookingStatus(b.status) || String(b.status);
      if (st === "completed" || st === "no_show") counts.completed += 1;
      else if (st === "cancelled_by_user" || st === "cancelled_by_manager") counts.cancelled += 1;
      else counts.pipeline += 1;
    }
    return [
      { name: "Completed", n: counts.completed },
      { name: "Open / scheduled", n: counts.pipeline },
      { name: "Cancelled", n: counts.cancelled }
    ].filter((x) => x.n > 0);
  }, [data?.bookings]);

  const m = data?.metrics;

  return (
    <>
      <div className="space-y-6">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {loading && !data ? <p className="text-sm text-muted-foreground">{t("common.loading")}</p> : null}

        {data ? (
          <>
            <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 to-muted/20 p-5 shadow-soft md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
                  <StatusBadge value={data.membership.status} />
                  {data.membership.role ? (
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      {data.membership.role}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.profile.email} {data.profile.phone ? ` · ${data.profile.phone}` : ""}
                </p>
              </div>
              {isStaff ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAccessOpen(true)}
                    className={accessBtn}
                  >
                    <KeyRound className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                    {t("manager.teachers.access")}
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={resetPassword}
                    className={recoveryBtn}
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                    Send password reset email
                  </button>
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => {
                      setPasswordError("");
                      setPasswordForm({ password: "", confirm: "" });
                      setPasswordOpen(true);
                    }}
                    className={recoveryBtn}
                  >
                    <KeyRound className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                    Set new password
                  </button>
                  {data.membership.status === "active" ? (
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => setDeactivateOpen(true)}
                      className={deactivateBtn}
                    >
                      <UserX className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                      {t("manager.teachers.deactivate")}
                    </button>
                  ) : null}
                  {data.membership.status === "inactive" ? (
                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => setActivateOpen(true)}
                      className={activateBtn}
                    >
                      <UserCheck className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                      Activate
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">School administrator account — manage via team settings.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1 border-b border-border/50 pb-1">
              {TABS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    tab === id ? "bg-primary/15 text-foreground ring-1 ring-primary/25" : "text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  {id === "profile" ? "Profil" : t(`school.teacher.tabs.${id}`)}
                </button>
              ))}
            </div>

            {tab === "profile" ? (
              <Card className="rounded-2xl border-border/60 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">Teacher account details</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Core account fields for this teacher. Permissions and policy stay in the Management tab.
                  </p>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    <span className="text-muted-foreground">Full name</span>
                    <Input
                      value={core.fullName}
                      onChange={(e) => setCore((prev) => ({ ...prev, fullName: e.target.value }))}
                      className="rounded-xl"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-muted-foreground">Email</span>
                    <Input
                      type="email"
                      value={core.email}
                      onChange={(e) => setCore((prev) => ({ ...prev, email: e.target.value }))}
                      className="rounded-xl"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-muted-foreground">Phone</span>
                    <Input
                      value={core.phone}
                      onChange={(e) => setCore((prev) => ({ ...prev, phone: e.target.value }))}
                      className="rounded-xl"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-muted-foreground">Title / specialization</span>
                    <Input
                      value={core.title}
                      onChange={(e) => setCore((prev) => ({ ...prev, title: e.target.value }))}
                      className="rounded-xl"
                      placeholder="e.g. Senior instructor"
                    />
                  </label>
                  <label className="space-y-1 text-xs sm:col-span-2">
                    <span className="text-muted-foreground">Account status</span>
                    <Select
                      value={core.status}
                      onChange={(e) => setCore((prev) => ({ ...prev, status: e.target.value }))}
                      className="rounded-xl"
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="suspended">suspended</option>
                    </Select>
                  </label>
                  <div className="sm:col-span-2 flex justify-end">
                    <Button type="button" className="rounded-xl" disabled={coreSaving} onClick={saveCore}>
                      {coreSaving ? "Saving..." : "Save core profile"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {tab === "management" ? (
              <SchoolTeacherManagementPanel
                slug={slug}
                userId={userId}
                data={data}
                onSaved={(detail) => {
                  if (detail && onTeacherDetailUpdate) {
                    onTeacherDetailUpdate(detail);
                    return;
                  }
                  onReload();
                }}
              />
            ) : null}

            {tab === "services" ? (
              <SchoolTeacherServicesTab
                slug={slug}
                userId={userId}
                data={data}
                onSaved={(detail) => {
                  if (detail && onTeacherDetailUpdate) {
                    onTeacherDetailUpdate(detail);
                    return;
                  }
                  onReload();
                }}
              />
            ) : null}

            {tab === "overview" ? (
              <section className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:grid-rows-2">
                  <SchoolKpiCard label="Students" value={String(m?.assignedStudents ?? "—")} hint="Primary instructor" />
                  <SchoolKpiCard label="Upcoming" value={String(m?.upcomingBookings ?? "—")} hint="Pending / confirmed" />
                  <SchoolKpiCard label="Completed" value={String(m?.completedLessons ?? "—")} />
                  <SchoolKpiCard label="Cancelled" value={String(m?.cancelledLessons ?? "—")} />
                  <SchoolKpiCard label="Booked hours (week)" value={m?.bookedHoursThisWeek != null ? String(m.bookedHoursThisWeek) : "—"} hint="Attributed pipeline" />
                  <SchoolKpiCard
                    label="Cancellation rate"
                    value={m?.cancellationRatePct != null ? `${m.cancellationRatePct}%` : "—"}
                    hint="Of attributed bookings"
                  />
                  <SchoolKpiCard label="Attributed bookings" value={String(m?.attributedBookings ?? "—")} hint="All time" />
                </div>
                <p className="text-xs text-muted-foreground">{t("school.teacher.analytics.hint")}</p>
              </section>
            ) : null}

            {tab === "students" ? (
              <Card className="rounded-2xl border-border/60 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">{t("school.teacher.tabs.students")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.students.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No students list this teacher as primary instructor.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-medium">Name</th>
                            <th className="pb-2 font-medium">Email</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium text-right">Open</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.students.map((s) => (
                            <tr key={s.userId} className="border-b border-border/30">
                              <td className="py-2 font-medium">{s.fullName || "—"}</td>
                              <td className="py-2 text-muted-foreground">{s.email || "—"}</td>
                              <td className="py-2">
                                <StatusBadge value={s.status} />
                              </td>
                              <td className="py-2 text-right">
                                <Link
                                  href={`/manager/${slug}/students/${s.userId}`}
                                  className="text-xs font-medium text-primary hover:underline"
                                >
                                  Profile
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {tab === "bookings" ? (
              <Card className="rounded-2xl border-border/60 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">{t("school.teacher.tabs.bookings")}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t("school.teacher.analytics.hint")}</p>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {data.bookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No attributed bookings yet.</p>
                  ) : (
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2 font-medium">Date</th>
                          <th className="pb-2 font-medium">Time</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.bookings.map((b) => (
                          <tr key={b.id} className="border-b border-border/30">
                            <td className="py-2 tabular-nums">{b.date}</td>
                            <td className="py-2 tabular-nums">{b.time}</td>
                            <td className="py-2">
                              <StatusBadge value={b.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {tab === "calendar" ? (
              <Card className="rounded-2xl border-border/60 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">{t("school.teacher.tabs.calendar")}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t("school.teacher.calendar.hint")}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {bookingsByDate.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bookings to show.</p>
                  ) : (
                    bookingsByDate.map(({ date, rows }) => (
                      <div key={date}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{date}</p>
                        <ul className="space-y-2">
                          {rows.map((b) => (
                            <li
                              key={b.id}
                              className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2 text-sm"
                            >
                              <span className="tabular-nums">{b.time}</span>
                              <StatusBadge value={b.status} />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : null}

            {tab === "availability" ? (
              <Card className="rounded-2xl border-border/60 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">{t("school.teacher.tabs.availability")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>{t("school.teacher.availability.hint")}</p>
                  <Link
                    href={`/manager/${slug}/availability`}
                    className="inline-flex rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted/40"
                  >
                    {t("manager.nav.availability")} →
                  </Link>
                </CardContent>
              </Card>
            ) : null}

            {tab === "analytics" ? (
              <Card className="rounded-2xl border-border/60 shadow-soft">
                <CardHeader>
                  <CardTitle className="text-base">{t("school.teacher.tabs.analytics")}</CardTitle>
                  <p className="text-xs text-muted-foreground">{t("school.teacher.analytics.hint")}</p>
                </CardHeader>
                <CardContent>
                  {analyticsBars.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Not enough booking data.</p>
                  ) : (
                    <div className="h-[220px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid hsl(var(--border))",
                              background: "hsl(var(--card))"
                            }}
                          />
                          <Bar dataKey="n" fill="hsl(217 91% 60%)" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>

      <TeacherAccessModal
        open={accessOpen}
        schoolName={businessName}
        schoolSlug={slug}
        teacher={data && isStaff ? { id: userId, fullName: data.profile.full_name, email: data.profile.email, status: data.membership.status } : null}
        onClose={() => setAccessOpen(false)}
      />

      <ConfirmDialog
        open={deactivateOpen}
        title="Deactivate teacher?"
        description="They will lose access until you activate the account again."
        onCancel={() => setDeactivateOpen(false)}
        onConfirm={deactivate}
      />

      <ConfirmDialog
        open={activateOpen}
        title="Activate teacher?"
        description="They will regain account access and appear in active views again."
        onCancel={() => setActivateOpen(false)}
        onConfirm={activate}
      />

      <ManagerDialog
        open={passwordOpen}
        onClose={() => {
          if (passwordSaving) return;
          setPasswordOpen(false);
        }}
        title="Set new teacher password"
      >
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Set a new password directly for this teacher account. The teacher can use it immediately on next login.
          </p>
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">New password</span>
            <Input
              type="password"
              autoComplete="new-password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
              className="rounded-xl"
            />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Confirm new password</span>
            <Input
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
              className="rounded-xl"
            />
          </label>
          {passwordError ? <p className="text-xs text-destructive">{passwordError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" disabled={passwordSaving} onClick={() => setPasswordOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-xl" disabled={passwordSaving} onClick={savePassword}>
              {passwordSaving ? "Saving..." : "Save password"}
            </Button>
          </div>
        </div>
      </ManagerDialog>
    </>
  );
}
