"use client";

import { useEffect, useMemo } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { ChartPreview } from "@/components/manager/chart-preview";
import { useManager } from "@/components/manager/provider";
import { StatsCard } from "@/components/shared/stats-card";
import {
  bookingsInClosedDateRange,
  countByWeekdayMonSun,
  getDisplayWeekRangeForBookings,
  normalizeBookingDate
} from "@/lib/manager/booking-date-utils";

export default function AnalyticsPage() {
  const { bookings, business } = useManager();
  const { t } = useLanguage();
  const weekRange = useMemo(() => getDisplayWeekRangeForBookings(bookings, new Date()), [bookings]);
  const weekBookings = useMemo(
    () => bookingsInClosedDateRange(bookings, weekRange.start, weekRange.end),
    [bookings, weekRange.start, weekRange.end]
  );

  const weeklyCount = weekBookings.length;
  const pending = weekBookings.filter((b) => b.status === "pending").length;
  const completed = weekBookings.filter((b) => b.status === "completed").length;
  const cancelled = weekBookings.filter((b) => b.status === "cancelled").length;
  const confirmed = weekBookings.filter((b) => b.status === "confirmed").length;
  const noShow = weekBookings.filter((b) => b.status === "no_show").length;
  const rescheduledMark = weekBookings.filter((b) => b.status === "rescheduled").length;

  const completionRate =
    weeklyCount === 0 ? "0%" : `${Math.round((completed / weeklyCount) * 100)}%`;
  const cancellationRate =
    weeklyCount === 0 ? "0%" : `${Math.round((cancelled / weeklyCount) * 100)}%`;

  const topService = useMemo(() => {
    const counts = weekBookings.reduce((acc, b) => {
      const s = b.service || "—";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "—";
  }, [weekBookings]);

  const estimatedRevenue = weekBookings.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const bar = useMemo(
    () => countByWeekdayMonSun(weekBookings, weekRange.start, weekRange.end),
    [weekBookings, weekRange.start, weekRange.end]
  );

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG_MANAGER_BOOKINGS !== "1") return;
    console.log("[Manager/Analytics]", {
      business_id: business?.id,
      weekRange,
      bookingsFromStore: bookings.length,
      normalizedDates: bookings.map((b) => normalizeBookingDate(b.date)),
      weekBookingsCount: weeklyCount,
      confirmed,
      completed,
      cancelled,
      pending,
      noShow
    });
  }, [business?.id, bookings, weekRange, weeklyCount, confirmed, completed, cancelled, pending, noShow]);

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.analytics.subtitle")} />
      <main className="space-y-4 p-4 pb-10 md:p-6 md:pb-12">
        <p className="text-xs text-muted-foreground">
          Metrics use bookings in the same Mon–Sun week as Calendar ({weekRange.start} → {weekRange.end}).
        </p>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatsCard label="Weekly Bookings" value={String(weeklyCount)} change="This week (Mon–Sun)" />
          <StatsCard label="Completion Rate" value={completionRate} change="Completed / all week" />
          <StatsCard label="Cancellation Rate" value={cancellationRate} change="Cancelled / all week" />
          <StatsCard label="Top Service" value={topService} change="Most selected" />
          <StatsCard label="Estimated Revenue" value={`$${estimatedRevenue}`} change="Scheduled value" />
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          <ChartPreview
            title="Weekly Booking Volume"
            subtitle={`${weekRange.start} → ${weekRange.end}`}
            points={bar}
            emptyLabel={t("manager.chart.noData")}
          />
          <ChartPreview
            title="Status distribution"
            subtitle="This week (counts by status)"
            emptyLabel={t("manager.chart.noData")}
            points={[
              { label: "Pending", value: pending },
              { label: "Confirmed", value: confirmed },
              { label: "Completed", value: completed },
              { label: "Cancelled", value: cancelled },
              { label: "No-show", value: noShow },
              { label: "Rescheduled", value: rescheduledMark }
            ]}
          />
        </section>
      </main>
    </>
  );
}
