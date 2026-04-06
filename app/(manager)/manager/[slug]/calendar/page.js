"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useManager } from "@/components/manager/provider";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  getDayColumnsForWeekStart,
  getDisplayWeekRangeForBookings,
  normalizeBookingDate
} from "@/lib/manager/booking-date-utils";

export default function CalendarPage() {
  const { bookings, business } = useManager();
  const { t } = useLanguage();
  const weekRange = getDisplayWeekRangeForBookings(bookings, new Date());
  const columns = getDayColumnsForWeekStart(weekRange.start);
  const rangeLabel = `${columns[0].dateStr} → ${columns[6].dateStr}`;

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG_MANAGER_BOOKINGS !== "1") return;
    const byDay = getDayColumnsForWeekStart(weekRange.start).map(({ dateStr }) => ({
      dateStr,
      count: bookings.filter((b) => normalizeBookingDate(b.date) === dateStr).length
    }));
    console.log("[Manager/Calendar]", {
      business_id: business?.id,
      weekRange,
      bookingsFromStore: bookings.length,
      normalizedDates: bookings.map((b) => normalizeBookingDate(b.date)),
      groupedDayCounts: byDay
    });
  }, [business?.id, bookings, weekRange.start, weekRange.end]);

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.calendar.subtitle")} />
      <main className="p-4 pb-10 md:p-6 md:pb-12">
        <Card>
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base">
              {t("manager.calendar.weekOf")} {rangeLabel}
            </CardTitle>
            <p className="text-xs text-muted-foreground">Bookings match the same dates as your Bookings list.</p>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:snap-none md:grid-cols-7 md:overflow-visible md:pb-0">
              {columns.map(({ label, dateStr }) => {
                const dayBookings = bookings
                  .filter((b) => normalizeBookingDate(b.date) === dateStr)
                  .sort((a, b) => String(a.time).localeCompare(String(b.time)));
                return (
                  <div
                    key={dateStr}
                    className="min-w-[11rem] shrink-0 snap-start rounded-xl border border-border/60 bg-muted/5 p-3 md:min-w-0"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="text-[10px] tabular-nums text-muted-foreground">{dateStr.slice(5)}</p>
                    <div className="mt-2 space-y-2">
                      {dayBookings.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">—</p>
                      ) : (
                        dayBookings.map((b) => (
                          <div key={b.id} className="rounded-lg border border-border/50 bg-card/80 p-2 text-[11px] shadow-sm">
                            <p className="font-medium tabular-nums">{b.time}</p>
                            <p className="truncate text-muted-foreground">{b.customer}</p>
                            <StatusBadge value={b.status} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
