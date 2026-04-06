"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useManager } from "@/components/manager/provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { ChevronDown } from "lucide-react";
import { localDateString, normalizeBookingDate } from "@/lib/manager/booking-date-utils";
import { ManualBookingDialog } from "@/components/manager/manual-booking-dialog";
import { RescheduleBookingDialog } from "@/components/manager/reschedule-booking-dialog";
import { BOOKING_TERMINAL_STATUSES } from "@/lib/manager/booking-constants";

export default function TodayPage() {
  const { bookings, bookingActions, customers, services, business } = useManager();
  const { t, locale } = useLanguage();
  const [newOpen, setNewOpen] = useState(false);
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const today = useMemo(() => localDateString(new Date()), []);
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
      }).format(new Date()),
    [locale]
  );
  const todayBookings = useMemo(() => {
    return bookings
      .filter((b) => normalizeBookingDate(b.date) === today)
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  }, [bookings, today]);

  return (
    <>
      <PageHeader
        businessName={business?.name}
        subtitle={`${t("manager.pages.today.subtitle")} · ${todayLabel}`}
        actions={
          <Button type="button" className="rounded-xl shadow-sm" onClick={() => setNewOpen(true)}>
            New booking
          </Button>
        }
      />
      <main className="grid gap-4 p-4 pb-10 md:p-6 md:pb-12">
        <Card>
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base">{t("manager.today.listTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("manager.today.pageSubtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {todayBookings.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/60 bg-muted/15 px-4 py-10 text-center text-sm text-muted-foreground">
                {t("manager.today.empty")}
              </p>
            ) : (
              todayBookings.map((item) => {
                const locked = BOOKING_TERMINAL_STATUSES.includes(item.status);
                return (
                  <div key={item.id} className="rounded-xl border border-border/60 bg-muted/5 p-4 transition hover:border-primary/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {item.time} — {item.customer}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.service}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                        <StatusBadge value={item.status} />
                        {!locked ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60">
                              Actions
                              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onSelect={() => bookingActions.updateStatus(item.id, "pending")}
                              >
                                Mark pending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => bookingActions.updateStatus(item.id, "confirmed")}
                              >
                                Confirm
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => bookingActions.updateStatus(item.id, "cancelled")}
                              >
                                Cancel
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => bookingActions.updateStatus(item.id, "completed")}
                              >
                                Complete
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => bookingActions.updateStatus(item.id, "no_show")}
                              >
                                No-show
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => setRescheduleFor(item)}>Reschedule…</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </div>
                    {locked ? (
                      <p className="mt-2 text-xs text-muted-foreground">No workflow actions for terminal status.</p>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </main>

      <ManualBookingDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        customers={customers}
        services={services}
        defaultDate={today}
        onSave={(payload) => bookingActions.save(payload)}
      />

      <RescheduleBookingDialog
        open={Boolean(rescheduleFor)}
        onClose={() => setRescheduleFor(null)}
        booking={rescheduleFor}
        onReschedule={(id, payload) => bookingActions.reschedule(id, payload)}
      />
    </>
  );
}
