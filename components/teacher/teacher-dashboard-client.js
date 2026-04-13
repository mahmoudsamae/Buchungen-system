"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Clock,
  PlusCircle,
  RefreshCw,
  Sparkles,
  UserPlus,
  Wrench
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { TeacherKpiCard } from "@/components/teacher/teacher-kpi-card";
import { cn } from "@/lib/utils";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtPct(v) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v}%`;
}

export function TeacherDashboardClient({ schoolName, schoolSlug, userEmail }) {
  const { t } = useLanguage();
  const base = `/teacher/${schoolSlug}`;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [qaWeekday, setQaWeekday] = useState(1);
  const [qaStart, setQaStart] = useState("09:00");
  const [qaEnd, setQaEnd] = useState("17:00");
  const [qaBusy, setQaBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await teacherFetch(schoolSlug, "/api/teacher/overview");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || t("teacher.dashboard.loadError"));
      setData(null);
    } else {
      setData(json);
    }
    setLoading(false);
  }, [schoolSlug, t]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = data?.kpis;
  const summary = data?.weeklyAvailabilitySummary;

  const summaryLines = useMemo(() => {
    if (!summary) return [];
    return WEEKDAY_SHORT.map((label, w) => {
      const slots = summary[w];
      if (!slots?.length) return { w, label, slots: [], sharedValidity: null };
      const validityKeys = slots
        .map((s) => `${s.validFrom || ""}|${s.validUntil || ""}`)
        .filter((x) => x !== "|");
      const uniqueValidity = [...new Set(validityKeys)];
      const sharedValidity = uniqueValidity.length === 1 ? uniqueValidity[0] : null;
      return {
        w,
        label,
        slots: slots.map((s) => ({
          time: `${s.start}–${s.end}`,
          validity: s.validFrom || s.validUntil ? `${s.validFrom || "…"} - ${s.validUntil || "…"}` : null
        })),
        sharedValidity
      };
    });
  }, [summary]);

  const stats = data?.availabilityStats;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{t("teacher.dashboard.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("teacher.dashboard.subtitle", { school: schoolName })}
            {userEmail ? (
              <>
                {" "}
                · <span className="font-mono text-xs text-foreground/80">{userEmail}</span>
              </>
            ) : null}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-2 rounded-xl" onClick={() => load()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          {t("common.refresh")}
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("teacher.dashboard.quickActions")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            href={`${base}/students`}
            className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-4 py-4 shadow-md transition hover:border-primary/30 hover:bg-card"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <UserPlus className="h-5 w-5" />
            </span>
            <span className="font-medium">{t("teacher.dashboard.action.addStudent")}</span>
          </Link>
          <Link
            href={`${base}/bookings`}
            className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-4 py-4 shadow-md transition hover:border-primary/30 hover:bg-card"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <PlusCircle className="h-5 w-5" />
            </span>
            <span className="font-medium">{t("teacher.dashboard.action.createBooking")}</span>
          </Link>
          <Link
            href={`${base}/availability`}
            className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-4 py-4 shadow-md transition hover:border-primary/30 hover:bg-card"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Wrench className="h-5 w-5" />
            </span>
            <span className="font-medium">{t("teacher.dashboard.action.manageAvailability")}</span>
          </Link>
          <Link
            href={`${base}/calendar`}
            className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-4 py-4 shadow-md transition hover:border-primary/30 hover:bg-card"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="font-medium">{t("teacher.dashboard.action.openCalendar")}</span>
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <TeacherKpiCard label={t("teacher.dashboard.kpi.totalStudents")} value={loading ? "…" : kpis?.totalStudents ?? 0} />
        <TeacherKpiCard label={t("teacher.dashboard.kpi.todayBookings")} value={loading ? "…" : kpis?.todayBookings ?? 0} />
        <TeacherKpiCard label={t("teacher.dashboard.kpi.upcomingBookings")} value={loading ? "…" : kpis?.upcomingBookings ?? 0} />
        <TeacherKpiCard label={t("teacher.dashboard.kpi.completedLessons")} value={loading ? "…" : kpis?.completedLessons ?? 0} />
        <TeacherKpiCard label={t("teacher.dashboard.kpi.cancelledLessons")} value={loading ? "…" : kpis?.cancelledLessons ?? 0} />
        <TeacherKpiCard
          label={t("teacher.dashboard.kpi.bookedHoursWeek")}
          value={loading ? "…" : kpis?.bookedHoursWeek ?? 0}
        />
        <TeacherKpiCard label={t("teacher.dashboard.kpi.utilization")} value={loading ? "…" : fmtPct(kpis?.utilizationPct)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              {t("teacher.dashboard.todaySchedule")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!data?.todaySchedule?.length ? (
              <p className="text-sm text-muted-foreground">{t("teacher.dashboard.emptySchedule")}</p>
            ) : (
              data.todaySchedule.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-background/40 px-3 py-2.5 text-sm"
                >
                  <span className="font-mono text-muted-foreground">{row.time}</span>
                  <span className="font-medium">{row.student}</span>
                  <span className="text-xs uppercase text-muted-foreground">{row.status}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("teacher.dashboard.upcoming")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!data?.upcomingBookings?.length ? (
              <p className="text-sm text-muted-foreground">{t("teacher.dashboard.emptyUpcoming")}</p>
            ) : (
              data.upcomingBookings.map((row) => (
                <Link
                  key={row.id}
                  href={`${base}/bookings`}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-background/40 px-3 py-2.5 text-sm transition hover:border-primary/25"
                >
                  <span className="text-muted-foreground">
                    {row.date} · {row.time}
                  </span>
                  <span className="font-medium">{row.student}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("teacher.dashboard.availabilitySummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {summaryLines.map((line) => (
              <div key={line.w} className="rounded-xl border border-border/35 bg-background/25 px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <span className="w-10 shrink-0 pt-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {line.label}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    {line.slots.length ? (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {line.slots.map((slot, idx) => (
                            <span
                              key={`${line.w}-${idx}-${slot.time}`}
                              className="inline-flex rounded-md border border-border/60 bg-muted/25 px-2 py-1 text-xs font-medium text-foreground/90"
                            >
                              {slot.time}
                            </span>
                          ))}
                        </div>
                        {line.sharedValidity ? (
                          <p className="text-[11px] text-muted-foreground">Valid: {line.sharedValidity}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Keine Verfugbarkeit</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("teacher.dashboard.availabilityStats")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/30 px-3 py-2">
              <span className="text-muted-foreground">{t("teacher.dashboard.activeRules")}</span>
              <span className="font-semibold">{loading ? "…" : stats?.activeRuleCount ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/30 px-3 py-2">
              <span className="text-muted-foreground">{t("teacher.dashboard.upcomingExceptions")}</span>
              <span className="font-semibold">{loading ? "…" : stats?.upcomingExceptions ?? "—"}</span>
            </div>
            <Link
              href={`${base}/availability`}
              className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/15"
            >
              <Sparkles className="h-4 w-4" />
              {t("teacher.availability.quickGenerate")} / {t("teacher.availability.title")}
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("teacher.dashboard.recentStudents")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!data?.recentStudents?.length ? (
              <p className="text-sm text-muted-foreground">{t("teacher.students.empty")}</p>
            ) : (
              data.recentStudents.map((s) => (
                <Link
                  key={s.userId}
                  href={`${base}/students/${s.userId}`}
                  className="flex items-center justify-between rounded-xl border border-border/40 px-3 py-2 text-sm hover:border-primary/25"
                >
                  <span>{s.name || t("teacher.student.title")}</span>
                  <span className="text-xs text-muted-foreground">{s.status}</span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              {t("teacher.dashboard.alerts")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!data?.alerts?.length ? (
              <p className="text-sm text-muted-foreground">{t("teacher.dashboard.noAlerts")}</p>
            ) : (
              data.alerts.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm",
                    a.severity === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-border/40 bg-background/40"
                  )}
                >
                  <p className="font-medium">{a.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("teacher.dashboard.inactiveStudents")}</CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.inactiveStudents?.length ? (
              <p className="text-sm text-muted-foreground">{t("teacher.dashboard.noInactive")}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {data.inactiveStudents.map((s) => (
                  <li key={s.userId}>
                    <Link href={`${base}/students/${s.userId}`} className="text-primary hover:underline">
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("teacher.dashboard.rescheduleRequests")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("teacher.dashboard.noReschedule")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
