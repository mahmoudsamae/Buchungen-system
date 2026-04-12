"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/navigation/page-header";
import { useManager } from "@/components/manager/provider";
import { SchoolKpiCard } from "@/components/school/school-kpi-card";
import { ChartPreview } from "@/components/manager/chart-preview";
import { StatusBadge } from "@/components/shared/status-badge";
import { BOOKING_TERMINAL_STATUSES, normalizeBookingStatus } from "@/lib/manager/booking-constants";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  bookingsInClosedDateRange,
  countByWeekdayMonSun,
  getWeekRangeMondayToSundayStrings,
  localDateString,
  normalizeBookingDate
} from "@/lib/manager/booking-date-utils";
import { managerFetch } from "@/lib/manager/manager-fetch";

export default function SchoolDashboardOverviewPage() {
  const { stats, bookings, business } = useManager();
  const { t } = useLanguage();
  const slug = business?.slug ?? "";
  const [insights, setInsights] = useState(null);
  const [insightError, setInsightError] = useState("");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const res = await managerFetch(slug, "/api/manager/school-insights");
      const j = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setInsightError(typeof j.error === "string" ? j.error : "Insights unavailable.");
        return;
      }
      setInsights(j);
      setInsightError("");
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const today = localDateString(new Date());
  const weekRange = getWeekRangeMondayToSundayStrings(new Date());
  const weekBookings = useMemo(
    () => bookingsInClosedDateRange(bookings, weekRange.start, weekRange.end),
    [bookings, weekRange.start, weekRange.end]
  );
  const weekBars = useMemo(
    () => countByWeekdayMonSun(weekBookings, weekRange.start, weekRange.end),
    [weekBookings, weekRange.start, weekRange.end]
  );
  const todayTimeline = useMemo(() => {
    return bookings
      .filter(
        (b) =>
          normalizeBookingDate(b.date) === today &&
          !BOOKING_TERMINAL_STATUSES.includes(normalizeBookingStatus(b.status) || String(b.status))
      )
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  }, [bookings, today]);

  const trend30 = insights?.charts?.bookingsOver30d || [];
  const chartTick = (v) => String(v).slice(5);

  const k = insights?.kpis;

  return (
    <>
      <PageHeader
        businessName={business?.name}
        subtitle={t("manager.pages.dashboard.subtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/manager/${slug}/teachers`}
              className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-soft hover:opacity-95"
            >
              {t("manager.nav.teachers")}
            </Link>
            <Link
              href={`/manager/${slug}/analytics`}
              className="rounded-xl border border-border/80 bg-card px-3 py-2 text-xs font-medium shadow-sm hover:bg-muted/60"
            >
              {t("manager.nav.reports")}
            </Link>
          </div>
        }
      />
      <main className="space-y-8 p-4 pb-12 md:p-6 md:pb-16">
        {insightError ? (
          <p className="rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">{insightError}</p>
        ) : null}

        <section className="rounded-2xl border border-border/40 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{t("school.dashboard.opsTitle")}</p>
          <p className="mt-1 text-xs">{t("school.dashboard.opsSubtitle")}</p>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">School pulse</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SchoolKpiCard
              label="Teachers"
              value={k != null ? String(k.totalTeachers) : "—"}
              hint="Active staff seats"
              trend={k ? `${k.totalManagers} school admin(s)` : null}
            />
            <SchoolKpiCard label="Students" value={k != null ? String(k.totalStudents) : "—"} hint="Enrolled customers" />
            <SchoolKpiCard label="All bookings" value={k != null ? String(k.totalBookings) : "—"} hint="Lifetime" />
            <SchoolKpiCard
              label="Today"
              value={k != null ? String(k.todayBookings) : "—"}
              hint="Bookings on calendar day"
            />
            <SchoolKpiCard
              label="Upcoming"
              value={k != null ? String(k.upcomingLessons) : "—"}
              hint="Pending / confirmed in the future"
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <SchoolKpiCard label="Completed" value={k != null ? String(k.completedLessons) : "—"} hint="Marked completed" />
            <SchoolKpiCard label="Cancelled" value={k != null ? String(k.cancelledLessons) : "—"} hint="User or school" />
            <SchoolKpiCard
              label="Most active teacher"
              value={k?.mostActiveTeacher?.name || "—"}
              hint={k?.mostActiveTeacher?.count != null ? `Attributed lessons · ${k.mostActiveTeacher.count}` : "By assignment"}
            />
            <SchoolKpiCard
              label="Lowest load (active)"
              value={k?.lowestUtilTeacher?.name || "—"}
              hint={k?.lowestUtilTeacher?.lessons != null ? `Attributed · ${k.lowestUtilTeacher.lessons}` : "Among active teachers"}
            />
            <SchoolKpiCard
              label="New students (MTD)"
              value={k != null ? String(k.newStudentsThisMonth) : "—"}
              hint="Joined this month"
            />
            <SchoolKpiCard
              label="Booking growth"
              value={k != null ? `${k.bookingGrowthRatePct >= 0 ? "+" : ""}${k.bookingGrowthRatePct}%` : "—"}
              hint="Week over week (attributed)"
            />
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Operations</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <SchoolKpiCard key={stat.label} label={stat.label} value={stat.value} hint={stat.change} />
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/60 shadow-soft ring-1 ring-border/25">
            <ChartPreview
              title={t("manager.dashboard.weekTrend")}
              subtitle={`${weekRange.start} → ${weekRange.end}`}
              points={weekBars}
              emptyLabel={t("manager.chart.noData")}
            />
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-soft ring-1 ring-border/25">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">30-day booking trend</h3>
              <span className="text-[11px] text-muted-foreground">School-wide</span>
            </div>
            <div className="mt-4 h-[240px] w-full min-w-0">
              {trend30.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">{t("manager.chart.noData")}</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend30} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/45" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={chartTick} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))"
                      }}
                    />
                    <Area type="monotone" dataKey="count" stroke="hsl(217 91% 60%)" fill="url(#dashArea)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-soft ring-1 ring-border/25">
            <h3 className="text-sm font-semibold">{t("manager.dashboard.todayTimeline")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{today}</p>
            <div className="mt-4 space-y-2">
              {todayTimeline.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
                  {t("manager.dashboard.todayEmpty")}
                </p>
              ) : (
                todayTimeline.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/manager/${slug}/teachers`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/10 px-4 py-3 transition hover:border-primary/30 hover:bg-muted/20"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        <span className="tabular-nums">{booking.time}</span> — {booking.customer}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{booking.service}</p>
                    </div>
                    <StatusBadge value={booking.status} />
                  </Link>
                ))
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-soft ring-1 ring-border/25">
            <h3 className="text-sm font-semibold">Quality</h3>
            <p className="mt-1 text-xs text-muted-foreground">Derived from your booking outcomes</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <SchoolKpiCard
                label="Completion rate"
                value={k?.completionRatePct != null ? `${k.completionRatePct}%` : "—"}
                hint="Completed / all bookings"
              />
              <SchoolKpiCard
                label="Cancellation rate"
                value={k?.cancellationRatePct != null ? `${k.cancellationRatePct}%` : "—"}
                hint="Cancelled / all bookings"
              />
            </div>
            <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
              Teacher attribution uses each student’s <strong>primary instructor</strong> assignment. Encourage staff to keep
              assignments current for meaningful load metrics.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
