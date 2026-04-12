"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarPlus,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  StickyNote,
  UserCog
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/i18n/language-provider";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { StatusBadge } from "@/components/shared/status-badge";
import { TeacherManualBookingDialog } from "@/components/teacher/teacher-manual-booking-dialog";
import { CopyLinkButton } from "@/components/access/copy-link-button";
import { QrCodeCard } from "@/components/access/qr-code-card";
import { cn } from "@/lib/utils";

const TABS = ["overview", "bookings", "requests", "notes", "access"];

export function TeacherStudentDetailClient({ schoolSlug, studentId }) {
  const { t } = useLanguage();
  const base = `/teacher/${schoolSlug}`;
  const [data, setData] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", phone: "", email: "" });
  const [status, setStatus] = useState("active");
  const [internalNote, setInternalNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [res, svcRes] = await Promise.all([
      teacherFetch(schoolSlug, `/api/teacher/students/${studentId}`),
      teacherFetch(schoolSlug, "/api/teacher/services")
    ]);
    const json = await res.json().catch(() => ({}));
    const svcJson = await svcRes.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || t("teacher.student.loadError"));
      setData(null);
    } else {
      setData(json);
      const p = json.profile || {};
      setForm({ fullName: p.full_name || "", phone: p.phone || "", email: p.email || "" });
      setStatus(json.membership?.status || "active");
      setInternalNote(json.membership?.internal_note || "");
    }
    if (svcRes.ok) setServices(svcJson.services || []);
    setLoading(false);
  }, [schoolSlug, studentId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const studentRow = data?.profile
    ? [
        {
          userId: studentId,
          fullName: (data.profile.full_name && String(data.profile.full_name).trim()) || "Student",
          email: data.profile.email || ""
        }
      ]
    : [];

  const pendingRequests = useMemo(() => {
    const rows = data?.bookings || [];
    return rows.filter((b) => {
      if (b.status !== "pending") return false;
      const src = b.bookingSource || "";
      return src === "student_request" || src === "portal";
    });
  }, [data?.bookings]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canonicalPath = data?.access?.canonicalPath || "";
  const canonicalAbsolute = origin && canonicalPath ? `${origin}${canonicalPath}` : canonicalPath;
  const accountStatus = data?.membership?.status || "active";

  const saveProfile = async () => {
    setSaving(true);
    const res = await teacherFetch(schoolSlug, `/api/teacher/students/${studentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        status,
        internalNote
      })
    });
    setSaving(false);
    if (res.ok) await load();
  };

  const sendRecovery = async () => {
    setRecoveryBusy(true);
    setRecoveryMsg("");
    const res = await teacherFetch(schoolSlug, `/api/teacher/students/${studentId}/recovery`, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setRecoveryBusy(false);
    if (res.ok) setRecoveryMsg(j.message || "Sent.");
    else setRecoveryMsg(j.error || "Failed.");
  };

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`${base}/students`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("teacher.students.title")}
        </Link>
      </div>

      {error ? <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      {loading || !data ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {(data.profile?.full_name && String(data.profile.full_name).trim()) || "Student"}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <StatusBadge value={accountStatus} />
                <span>{data.profile?.email || "—"}</span>
                {data.profile?.phone ? <span>{data.profile.phone}</span> : <span className="text-muted-foreground">No phone</span>}
                {data.membership?.created_at ? (
                  <span className="text-xs">Joined {String(data.membership.created_at).slice(0, 10)}</span>
                ) : null}
              </div>
              {data.instructorName ? (
                <p className="mt-2 text-sm text-foreground/80">
                  Primary instructor: <span className="font-medium">{data.instructorName}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setTab("overview")}>
                <UserCog className="h-4 w-4" />
                Edit
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setTab("access")}>
                <Lock className="h-4 w-4" />
                Access
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={sendRecovery} disabled={recoveryBusy}>
                {recoveryBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Reset password
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-danger border-danger/40"
                onClick={async () => {
                  if (!confirm("Deactivate this student? They will not be able to book until reactivated.")) return;
                  setStatus("inactive");
                  await teacherFetch(schoolSlug, `/api/teacher/students/${studentId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "inactive" })
                  });
                  await load();
                }}
              >
                Deactivate
              </Button>
              <Button type="button" className="gap-2 rounded-xl" onClick={() => setBookingOpen(true)}>
                <CalendarPlus className="h-4 w-4" />
                {t("teacher.student.newBooking")}
              </Button>
            </div>
          </div>
          {recoveryMsg ? <p className="text-xs text-muted-foreground">{recoveryMsg}</p> : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Kpi label="Completed lessons" value={stats?.totalLessons ?? "—"} />
            <Kpi label="Upcoming" value={stats?.upcomingCount ?? "—"} />
            <Kpi label="Pending requests" value={stats?.pendingRequests ?? "—"} />
            <Kpi label="Last lesson" value={stats?.lastLesson || "—"} small />
            <Kpi label="Next booking" value={stats?.nextBooking || "—"} small />
          </div>

          <div className="flex flex-wrap gap-1 rounded-xl border border-border/50 bg-muted/20 p-1">
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium capitalize",
                  tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {id}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">{t("teacher.student.profile")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">{t("teacher.settings.name")}</span>
                    <Input
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      className="rounded-xl"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">{t("teacher.settings.email")}</span>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="rounded-xl"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">{t("teacher.settings.phone")}</span>
                    <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="rounded-xl" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">{t("teacher.students.col.status")}</span>
                    <select
                      className="h-10 w-full rounded-xl border bg-card px-3 text-sm"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">{t("teacher.student.internalNote")}</span>
                    <textarea
                      className="min-h-[80px] w-full rounded-xl border bg-card px-3 py-2 text-sm"
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                    />
                  </label>
                  <Button type="button" className="rounded-xl" disabled={saving} onClick={saveProfile}>
                    {t("teacher.student.save")}
                  </Button>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <LayoutDashboard className="h-4 w-4" />
                    Upcoming
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!data.upcoming?.length ? (
                    <p className="text-sm text-muted-foreground">—</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {data.upcoming.map((b) => (
                        <li key={b.id} className="flex justify-between gap-2 rounded-lg border border-border/40 px-3 py-2">
                          <span className="font-mono text-xs">
                            {String(b.booking_date).slice(0, 10)} {String(b.start_time).slice(0, 5)}
                          </span>
                          <StatusBadge value={b.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {tab === "bookings" ? (
            <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{t("teacher.student.bookings")}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-left text-xs uppercase text-muted-foreground">
                      <th className="pb-2">When</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.bookings || []).map((b) => (
                      <tr key={b.id} className="border-b border-border/30">
                        <td className="py-2 font-mono">
                          {b.date} · {b.time}–{b.endTime}
                        </td>
                        <td className="py-2">
                          <StatusBadge value={b.status} />
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">{b.bookingSource || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}

          {tab === "requests" ? (
            <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Pending student requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!pendingRequests.length ? (
                  <p className="text-sm text-muted-foreground">No pending booking requests.</p>
                ) : (
                  <ul className="space-y-3">
                    {pendingRequests.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-3"
                      >
                        <div>
                          <p className="font-mono text-sm">
                            {b.date} · {b.time}
                          </p>
                          <p className="text-xs text-muted-foreground">Source: {b.bookingSource || "—"}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-lg"
                            onClick={async () => {
                              const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${b.id}/approve`, {
                                method: "POST"
                              });
                              if (res.ok) await load();
                              else {
                                const j = await res.json().catch(() => ({}));
                                alert(j.error || "Could not approve");
                              }
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={async () => {
                              const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${b.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: "rejected" })
                              });
                              if (res.ok) await load();
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}

          {tab === "notes" ? (
            <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <StickyNote className="h-4 w-4" />
                  {t("teacher.student.notes")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!data.notes?.length ? (
                  <p className="text-muted-foreground">—</p>
                ) : (
                  <ul className="space-y-2">
                    {data.notes.map((n) => (
                      <li key={n.id} className="rounded-xl border border-border/40 bg-background/30 px-3 py-2">
                        <p className="whitespace-pre-wrap text-foreground/90">{n.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{String(n.created_at || "").slice(0, 16)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}

          {tab === "access" ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Student access</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    One link for this student — it encodes this school, you as their instructor, and their account. Use it for
                    copy, open, and QR.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {canonicalAbsolute ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Access link</p>
                      <p className="mt-1 break-all font-mono text-xs">{canonicalAbsolute}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <CopyLinkButton text={canonicalAbsolute} label="Copy link" />
                        <a
                          href={canonicalAbsolute}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-transparent px-3 text-sm font-medium transition hover:bg-muted"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      Access link could not be generated. Reload the page or contact support.
                    </p>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Account status</p>
                    <div className="mt-1">
                      <StatusBadge value={accountStatus} />
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="rounded-xl" onClick={sendRecovery} disabled={recoveryBusy}>
                    Email password reset
                  </Button>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">QR code</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                  {canonicalAbsolute ? (
                    <>
                      <QrCodeCard value={canonicalAbsolute} caption="Same access link — scan to open it on a phone." />
                      <CopyLinkButton text={canonicalAbsolute} label="Copy same link" />
                    </>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">No link to encode yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <TeacherManualBookingDialog
            open={bookingOpen}
            onClose={() => setBookingOpen(false)}
            title={t("teacher.student.newBooking")}
            schoolSlug={schoolSlug}
            students={studentRow}
            services={services}
            onCreated={() => load()}
          />
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, small }) {
  return (
    <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
      <CardContent className={cn("pt-5", small && "pt-4")}>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-1 font-semibold text-foreground", small ? "text-xs" : "text-lg")}>{value}</p>
      </CardContent>
    </Card>
  );
}
