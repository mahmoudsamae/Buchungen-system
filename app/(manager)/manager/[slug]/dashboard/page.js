"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useManager } from "@/components/manager/provider";
import { StatsCard } from "@/components/shared/stats-card";
import { ChartPreview } from "@/components/manager/chart-preview";
import { StatusBadge } from "@/components/shared/status-badge";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  bookingsInClosedDateRange,
  countByWeekdayMonSun,
  getWeekRangeMondayToSundayStrings,
  localDateString,
  normalizeBookingDate
} from "@/lib/manager/booking-date-utils";

export default function ManagerDashboardPage() {
  const { stats, bookings, business } = useManager();
  const { t } = useLanguage();
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
      .filter((b) => normalizeBookingDate(b.date) === today && b.status !== "cancelled")
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  }, [bookings, today]);

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.dashboard.subtitle")} />
      <main className="space-y-6 p-4 pb-10 md:p-6 md:pb-12">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatsCard key={stat.label} {...stat} />
          ))}
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          <ChartPreview
            title={t("manager.dashboard.weekTrend")}
            points={weekBars}
            subtitle={`${weekRange.start} → ${weekRange.end}`}
            emptyLabel={t("manager.chart.noData")}
          />
          <div className="rounded-xl border border-border/70 bg-card p-5 shadow-soft ring-1 ring-border/30">
            <p className="text-sm font-semibold">{t("manager.dashboard.todayTimeline")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{today}</p>
            <div className="mt-4 space-y-2">
              {todayTimeline.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("manager.dashboard.todayEmpty")}
                </p>
              ) : (
                todayTimeline.map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-left transition hover:border-primary/25 hover:bg-muted/25"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        <span className="tabular-nums">{booking.time}</span> — {booking.customer}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{booking.service}</p>
                    </div>
                    <StatusBadge value={booking.status} />
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
