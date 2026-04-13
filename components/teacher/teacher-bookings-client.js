"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, CalendarClock, Check, CheckCircle2, Plus, RotateCcw, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ManagerDialog } from "@/components/manager/dialog";
import { useLanguage } from "@/components/i18n/language-provider";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { StatusBadge } from "@/components/shared/status-badge";
import { TeacherManualBookingDialog } from "@/components/teacher/teacher-manual-booking-dialog";
import { CompleteLessonDialog } from "@/components/manager/complete-lesson-dialog";
import { BOOKING_STATUSES } from "@/lib/manager/booking-constants";
import { hasBookingEnded, hasBookingStarted } from "@/lib/booking/booking-lifecycle";
import { cn } from "@/lib/utils";

function bookingForEndCheck(b) {
  return {
    booking_date: b.date,
    start_time: b.time,
    end_time: b.endTime ? `${String(b.endTime).slice(0, 5)}:00` : null
  };
}

function bookingForLifecycleUi(b) {
  return {
    booking_date: b.date,
    start_time: b.time,
    end_time: b.endTime ? `${String(b.endTime).slice(0, 5)}:00` : null
  };
}

function normSlotStartKey(dateYmd, startHHMM) {
  return `${String(dateYmd).slice(0, 10)}|${String(startHHMM).slice(0, 5)}`;
}

const actionBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

const newBookingBtn =
  "gap-2 rounded-xl border border-primary/35 bg-primary/95 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:border-primary/50 hover:bg-primary hover:shadow-xl hover:shadow-primary/25 focus-visible:ring-primary/60";

const completeBtn =
  `${actionBase} border-emerald-500/30 bg-emerald-950/35 text-emerald-100 hover:border-emerald-400/45 hover:bg-emerald-900/45 focus-visible:ring-emerald-500/50`;

const rescheduleBtn =
  `${actionBase} border-zinc-600/55 bg-zinc-900/60 text-zinc-100 hover:border-zinc-500/70 hover:bg-zinc-800/80 focus-visible:ring-zinc-400/45`;

const cancelBtn =
  `${actionBase} border-red-500/35 bg-red-950/30 text-red-100 hover:border-red-400/50 hover:bg-red-950/55 hover:text-red-50 focus-visible:ring-red-500/55`;

const approveBtn =
  `${actionBase} border-emerald-500/35 bg-emerald-950/30 text-emerald-100 hover:border-emerald-400/50 hover:bg-emerald-900/40 focus-visible:ring-emerald-500/50`;

const rejectBtn =
  `${actionBase} border-amber-500/35 bg-amber-950/25 text-amber-100 hover:border-amber-400/45 hover:bg-amber-950/45 focus-visible:ring-amber-500/50`;

const restoreBtn =
  `${actionBase} border-sky-500/35 bg-sky-950/30 text-sky-100 hover:border-sky-400/45 hover:bg-sky-900/40 focus-visible:ring-sky-500/50`;

const noShowBtn =
  `${actionBase} border-orange-500/35 bg-orange-950/30 text-orange-100 hover:border-orange-400/50 hover:bg-orange-900/40 focus-visible:ring-orange-500/50`;

export function TeacherBookingsClient({ schoolSlug, businessTimeZone = "UTC" }) {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [completeBooking, setCompleteBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [resBusy, setResBusy] = useState(false);
  const [resSlotsLoading, setResSlotsLoading] = useState(false);
  const [resDayLoading, setResDayLoading] = useState(false);
  const [resNextSlots, setResNextSlots] = useState([]);
  const [resBrowseDates, setResBrowseDates] = useState([]);
  const [resDaySlots, setResDaySlots] = useState([]);
  const [resBrowseDay, setResBrowseDay] = useState("");
  const [resSelectedSlot, setResSelectedSlot] = useState(null);
  const [resReason, setResReason] = useState("");
  const [resModalError, setResModalError] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [noShowTarget, setNoShowTarget] = useState(null);
  const [noShowBusy, setNoShowBusy] = useState(false);
  const [noShowModalError, setNoShowModalError] = useState("");
  const [allowTeachersToRestoreCancelledBookings, setAllowTeachersToRestoreCancelledBookings] = useState(false);
  const [canTeacherRestoreCancelledBookings, setCanTeacherRestoreCancelledBookings] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreModalError, setRestoreModalError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const path = `/api/teacher/bookings${qs.toString() ? `?${qs}` : ""}`;
    const [bRes, sRes] = await Promise.all([
      teacherFetch(schoolSlug, path),
      teacherFetch(schoolSlug, "/api/teacher/students")
    ]);
    const bJson = await bRes.json().catch(() => ({}));
    const sJson = await sRes.json().catch(() => ({}));
    if (!bRes.ok) {
      setError(bJson.error || t("teacher.bookings.loadError"));
      setBookings([]);
      setAllowTeachersToRestoreCancelledBookings(false);
      setCanTeacherRestoreCancelledBookings(false);
    } else {
      setBookings(bJson.bookings || []);
      setAllowTeachersToRestoreCancelledBookings(Boolean(bJson.allowTeachersToRestoreCancelledBookings));
      setCanTeacherRestoreCancelledBookings(Boolean(bJson.canTeacherRestoreCancelledBookings));
    }
    if (sRes.ok) setStudents(sJson.students || []);
    setLoading(false);
  }, [schoolSlug, from, to, t]);

  useEffect(() => {
    const n = new Date();
    const start = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    const end = new Date(n.getFullYear(), n.getMonth() + 2, 0);
    setFrom(start.toISOString().slice(0, 10));
    setTo(end.toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (!from || !to) return;
    load();
  }, [load, from, to]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (studentFilter && b.customerUserId !== studentFilter) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      return true;
    });
  }, [bookings, studentFilter, statusFilter]);

  /** Omit the chip that only repeats this booking’s current start (save uses start time only). */
  const resNextSlotsChoice = useMemo(() => {
    if (!rescheduleBooking) return resNextSlots;
    const cur = normSlotStartKey(rescheduleBooking.date, rescheduleBooking.time);
    return resNextSlots.filter((s) => normSlotStartKey(s.date, s.start) !== cur);
  }, [resNextSlots, rescheduleBooking]);

  const resDaySlotsChoice = useMemo(() => {
    if (!rescheduleBooking || !resBrowseDay) return resDaySlots;
    if (resBrowseDay !== String(rescheduleBooking.date).slice(0, 10)) return resDaySlots;
    const cur = normSlotStartKey(rescheduleBooking.date, rescheduleBooking.time);
    return resDaySlots.filter((s) => normSlotStartKey(resBrowseDay, s.start) !== cur);
  }, [resDaySlots, rescheduleBooking, resBrowseDay]);

  useEffect(() => {
    if (!rescheduleBooking) return;
    let cancelled = false;
    (async () => {
      setResSlotsLoading(true);
      setResModalError("");
      setResSelectedSlot(null);
      setResReason("");
      setResDaySlots([]);
      setResBrowseDay("");
      const base = new URLSearchParams({
        customerUserId: rescheduleBooking.customerUserId,
        excludeBookingId: rescheduleBooking.id
      });
      const [rNext, rBrowse] = await Promise.all([
        teacherFetch(schoolSlug, `/api/teacher/bookings/reschedule-slots?${base}&next=8`),
        teacherFetch(schoolSlug, `/api/teacher/bookings/reschedule-slots?${base}&browseDates=1&horizonDays=21`)
      ]);
      const jNext = await rNext.json().catch(() => ({}));
      const jBrowse = await rBrowse.json().catch(() => ({}));
      if (cancelled) return;
      if (!rNext.ok) {
        setResModalError(typeof jNext.error === "string" ? jNext.error : "Could not load available slots.");
        setResNextSlots([]);
      } else {
        setResNextSlots(Array.isArray(jNext.nextSlots) ? jNext.nextSlots : []);
      }
      if (rBrowse.ok && Array.isArray(jBrowse.dates)) {
        setResBrowseDates(jBrowse.dates);
      } else {
        setResBrowseDates([]);
      }
      setResSlotsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [rescheduleBooking?.id, rescheduleBooking?.customerUserId, schoolSlug]);

  const loadRescheduleDaySlots = useCallback(
    async (dateStr) => {
      if (!rescheduleBooking || !dateStr) return;
      setResDayLoading(true);
      setResModalError("");
      const qs = new URLSearchParams({
        customerUserId: rescheduleBooking.customerUserId,
        excludeBookingId: rescheduleBooking.id,
        date: dateStr
      });
      const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/reschedule-slots?${qs}`);
      const j = await res.json().catch(() => ({}));
      setResDayLoading(false);
      if (!res.ok) {
        setResModalError(typeof j.error === "string" ? j.error : "Could not load slots for that day.");
        setResDaySlots([]);
        return;
      }
      setResDaySlots(Array.isArray(j.slots) ? j.slots : []);
    },
    [rescheduleBooking, schoolSlug]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("teacher.bookings.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("teacher.bookings.subtitle")}</p>
        </div>
        <Button type="button" className={cn(newBookingBtn)} onClick={() => setManualOpen(true)}>
          <Plus className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
          {t("teacher.bookings.new")}
        </Button>
      </div>

      {error ? <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{t("common.search")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("teacher.bookings.filterDate")} (from)</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("teacher.bookings.filterDate")} (to)</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl" />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("teacher.bookings.filterStudent")}</span>
            <Select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}>
              <option value="">{t("teacher.bookings.allStudents")}</option>
              {students.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.fullName || s.email}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("teacher.bookings.filterStatus")}</span>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t("teacher.bookings.allStatuses")}</option>
              {BOOKING_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </Select>
          </label>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
        <CardContent className="overflow-x-auto pt-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("teacher.bookings.empty")}</p>
          ) : (
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-3">{t("teacher.bookings.col.when")}</th>
                  <th className="pb-2 pr-3">{t("teacher.bookings.col.student")}</th>
                  <th className="pb-2 pr-3">{t("teacher.bookings.col.service")}</th>
                  <th className="pb-2 pr-3">{t("teacher.bookings.col.status")}</th>
                  <th className="pb-2">{t("teacher.bookings.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-border/30">
                    <td className="py-3 pr-3 font-mono text-muted-foreground">
                      {b.date} · {b.time}
                      {b.endTime ? `–${b.endTime}` : ""}
                    </td>
                    <td className="py-3 pr-3 font-medium">{b.customer}</td>
                    <td className="py-3 pr-3">{b.service}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge value={b.status} />
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {b.status === "pending" && (b.bookingSource === "student_request" || b.bookingSource === "portal") ? (
                          <>
                            <button
                              type="button"
                              className={approveBtn}
                              onClick={async () => {
                                const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${b.id}/approve`, {
                                  method: "POST"
                                });
                                if (res.ok) await load();
                                else {
                                  const j = await res.json().catch(() => ({}));
                                  toast.error(j.error || "Could not approve");
                                }
                              }}
                            >
                              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              Approve
                            </button>
                            <button
                              type="button"
                              className={rejectBtn}
                              onClick={async () => {
                                if (!confirm("Reject this request?")) return;
                                const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${b.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "rejected" })
                                });
                                if (res.ok) await load();
                              }}
                            >
                              <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              Reject
                            </button>
                          </>
                        ) : null}
                        {b.status === "confirmed" ? (
                          <>
                            <button
                              type="button"
                              className={completeBtn}
                              disabled={!hasBookingEnded(bookingForEndCheck(b), businessTimeZone)}
                              title={
                                hasBookingEnded(bookingForEndCheck(b), businessTimeZone)
                                  ? undefined
                                  : "Available after the lesson end time (school timezone)."
                              }
                              onClick={() => setCompleteBooking(b)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              {t("teacher.bookings.complete")}
                            </button>
                            {hasBookingStarted(bookingForLifecycleUi(b), businessTimeZone) ? (
                              <button
                                type="button"
                                className={noShowBtn}
                                onClick={() => {
                                  setNoShowModalError("");
                                  setNoShowTarget(b);
                                }}
                              >
                                <UserX className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
                                No-show
                              </button>
                            ) : null}
                          </>
                        ) : null}
                        {canTeacherRestoreCancelledBookings &&
                        (b.status === "cancelled_by_manager" || b.status === "cancelled_by_user") &&
                        !hasBookingStarted(bookingForLifecycleUi(b), businessTimeZone) ? (
                          <button
                            type="button"
                            className={restoreBtn}
                            onClick={() => setRestoreTarget(b)}
                          >
                            <RotateCcw className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                            {t("teacher.bookings.restore")}
                          </button>
                        ) : null}
                        {["pending", "confirmed"].includes(b.status) ? (
                          <>
                            <button
                              type="button"
                              className={rescheduleBtn}
                              onClick={() => {
                                setRescheduleBooking(b);
                              }}
                            >
                              <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                              {t("teacher.bookings.reschedule")}
                            </button>
                            <button
                              type="button"
                              className={cancelBtn}
                              onClick={() => setCancelTarget(b)}
                            >
                              <Ban className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                              {t("teacher.bookings.cancel")}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <TeacherManualBookingDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        title={t("teacher.bookings.new")}
        schoolSlug={schoolSlug}
        students={students}
        onCreated={() => load()}
      />

      <CompleteLessonDialog
        open={Boolean(completeBooking)}
        booking={completeBooking}
        onClose={() => setCompleteBooking(null)}
        onSubmit={async (id, payload) => {
          const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${id}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            toast.error(typeof j.error === "string" ? j.error : "Could not complete lesson.");
            return false;
          }
          await load();
          return true;
        }}
      />

      <ManagerDialog open={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title={t("teacher.bookings.cancel")}>
        {cancelTarget ? (
          <div className="space-y-4 text-sm">
            <p className="rounded-lg border border-red-500/30 bg-red-950/25 px-3 py-2 text-red-100">
              This will cancel the lesson for the student. This action cannot be undone from here.
            </p>
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Student:</span> {cancelTarget.customer}
              </p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Lesson:</span> {cancelTarget.date} · {cancelTarget.time}
                {cancelTarget.endTime ? `–${cancelTarget.endTime}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCancelTarget(null)}>
                Back
              </Button>
              <Button
                type="button"
                variant="danger"
                className="rounded-xl"
                onClick={async () => {
                  const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${cancelTarget.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "cancelled_by_manager" })
                  });
                  setCancelTarget(null);
                  if (res.ok) await load();
                  else {
                    const j = await res.json().catch(() => ({}));
                    toast.error(typeof j.error === "string" ? j.error : "Could not cancel.");
                  }
                }}
              >
                Confirm cancellation
              </Button>
            </div>
          </div>
        ) : null}
      </ManagerDialog>

      <ManagerDialog
        open={Boolean(noShowTarget)}
        onClose={() => {
          if (noShowBusy) return;
          setNoShowTarget(null);
          setNoShowModalError("");
        }}
        title="No-show"
      >
        {noShowTarget ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Mark this lesson as no-show? Use this only when the student did not attend the scheduled lesson.
            </p>
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Student:</span> {noShowTarget.customer}
              </p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Lesson:</span> {noShowTarget.date} · {noShowTarget.time}
                {noShowTarget.endTime ? `–${noShowTarget.endTime}` : ""}
              </p>
            </div>
            {noShowModalError ? (
              <p className="rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-xs text-amber-100" role="alert">
                {noShowModalError}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={noShowBusy}
                onClick={() => {
                  setNoShowTarget(null);
                  setNoShowModalError("");
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={noShowBusy}
                onClick={async () => {
                  setNoShowModalError("");
                  setNoShowBusy(true);
                  const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${noShowTarget.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "no_show" })
                  });
                  const j = await res.json().catch(() => ({}));
                  setNoShowBusy(false);
                  if (res.ok) {
                    setNoShowTarget(null);
                    await load();
                  } else {
                    setNoShowModalError(typeof j.error === "string" ? j.error : "Could not mark as no-show.");
                  }
                }}
              >
                {noShowBusy ? t("common.loading") : "Confirm no-show"}
              </Button>
            </div>
          </div>
        ) : null}
      </ManagerDialog>

      <ManagerDialog
        open={Boolean(restoreTarget)}
        onClose={() => {
          if (restoreBusy) return;
          setRestoreTarget(null);
          setRestoreModalError("");
        }}
        title={t("teacher.bookings.restoreTitle")}
      >
        {restoreTarget ? (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">{t("teacher.bookings.restoreConfirmBody")}</p>
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Student:</span> {restoreTarget.customer}
              </p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Lesson:</span> {restoreTarget.date} · {restoreTarget.time}
                {restoreTarget.endTime ? `–${restoreTarget.endTime}` : ""}
              </p>
            </div>
            {restoreModalError ? (
              <p className="rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-xs text-amber-100" role="alert">
                {restoreModalError}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={restoreBusy}
                onClick={() => {
                  setRestoreTarget(null);
                  setRestoreModalError("");
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={restoreBusy}
                onClick={async () => {
                  setRestoreModalError("");
                  setRestoreBusy(true);
                  const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${restoreTarget.id}/restore`, {
                    method: "POST"
                  });
                  const j = await res.json().catch(() => ({}));
                  setRestoreBusy(false);
                  if (res.ok) {
                    setRestoreTarget(null);
                    await load();
                  } else {
                    setRestoreModalError(typeof j.error === "string" ? j.error : t("teacher.bookings.restoreError"));
                  }
                }}
              >
                {restoreBusy ? t("common.loading") : t("teacher.bookings.restoreConfirm")}
              </Button>
            </div>
          </div>
        ) : null}
      </ManagerDialog>

      <ManagerDialog
        open={Boolean(rescheduleBooking)}
        onClose={() => {
          setRescheduleBooking(null);
          setResModalError("");
          setResSelectedSlot(null);
        }}
        title={t("teacher.bookings.reschedule")}
      >
        {rescheduleBooking ? (
          <form
            className="space-y-4 text-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!resSelectedSlot) {
                setResModalError("Choose one of the available slots.");
                return;
              }
              setResBusy(true);
              setResModalError("");
              const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${rescheduleBooking.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  date: resSelectedSlot.date,
                  time: resSelectedSlot.start,
                  reschedule_reason: resReason.trim() || undefined
                })
              });
              setResBusy(false);
              const j = await res.json().catch(() => ({}));
              if (res.ok) {
                setRescheduleBooking(null);
                setResSelectedSlot(null);
                setResReason("");
                await load();
              } else {
                setResModalError(typeof j.error === "string" ? j.error : "Could not reschedule. Try another slot.");
              }
            }}
          >
            <div className="rounded-xl border border-border/60 bg-zinc-950/40 px-3 py-2.5 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Student:</span> {rescheduleBooking.customer}
              </p>
              <p className="mt-1">
                <span className="font-medium text-foreground">Current time:</span> {rescheduleBooking.date} · {rescheduleBooking.time}
                {rescheduleBooking.endTime ? `–${rescheduleBooking.endTime}` : ""}
              </p>
            </div>

            {resModalError ? (
              <div className="rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-xs text-amber-100" role="alert">
                {resModalError}
              </div>
            ) : null}

            {resSlotsLoading ? (
              <p className="text-xs text-muted-foreground">Loading available slots…</p>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next available slots</p>
                  {resNextSlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No immediate slots found in the next few weeks. Pick a day below.</p>
                  ) : resNextSlotsChoice.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No other start times in the quick list yet — your current start is omitted. Browse by day below.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {resNextSlotsChoice.map((s) => {
                        const key = `${s.date}-${s.start}-${s.end}`;
                        const active =
                          resSelectedSlot &&
                          resSelectedSlot.date === s.date &&
                          resSelectedSlot.start === s.start &&
                          resSelectedSlot.end === s.end;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setResSelectedSlot({ date: s.date, start: s.start, end: s.end });
                              setResModalError("");
                            }}
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium tabular-nums transition",
                              active
                                ? "border-primary/60 bg-primary/15 text-foreground ring-1 ring-primary/40"
                                : "border-border/60 bg-card/50 text-muted-foreground hover:border-border hover:bg-muted/30"
                            )}
                          >
                            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{s.date}</span>
                            {s.start}–{s.end}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Browse by day</p>
                  <Select
                    value={resBrowseDay}
                    onChange={(e) => {
                      const v = e.target.value;
                      setResBrowseDay(v);
                      setResModalError("");
                      if (v) loadRescheduleDaySlots(v);
                      else setResDaySlots([]);
                    }}
                  >
                    <option value="">Select a date…</option>
                    {resBrowseDates.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </Select>
                  {resDayLoading ? (
                    <p className="text-xs text-muted-foreground">Loading slots…</p>
                  ) : resBrowseDay && resDaySlots.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No bookable windows on this day.</p>
                  ) : resBrowseDay && resDaySlotsChoice.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Only your current start time is open on this day — pick another date or contact the school.
                    </p>
                  ) : resBrowseDay ? (
                    <div className="flex flex-wrap gap-2">
                      {resDaySlotsChoice.map((s) => {
                        const key = `${resBrowseDay}-${s.start}-${s.end}`;
                        const active =
                          resSelectedSlot &&
                          resSelectedSlot.date === resBrowseDay &&
                          resSelectedSlot.start === s.start &&
                          resSelectedSlot.end === s.end;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setResSelectedSlot({ date: resBrowseDay, start: s.start, end: s.end });
                              setResModalError("");
                            }}
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-xs font-medium tabular-nums transition",
                              active
                                ? "border-primary/60 bg-primary/15 text-foreground ring-1 ring-primary/40"
                                : "border-border/60 bg-card/50 text-muted-foreground hover:border-border hover:bg-muted/30"
                            )}
                          >
                            {s.start}–{s.end}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <label className="block space-y-1">
                  <span className="text-xs text-muted-foreground">Note for your records (optional)</span>
                  <Textarea
                    value={resReason}
                    onChange={(e) => setResReason(e.target.value)}
                    placeholder="Reason for moving the lesson…"
                    rows={2}
                    className="min-h-[64px] rounded-xl border-border/60 bg-background/50 text-sm"
                  />
                </label>
              </>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-border/40 pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  setRescheduleBooking(null);
                  setResModalError("");
                  setResSelectedSlot(null);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="rounded-xl" disabled={resBusy || resSlotsLoading || !resSelectedSlot}>
                {resBusy ? "Saving…" : "Save new time"}
              </Button>
            </div>
          </form>
        ) : null}
      </ManagerDialog>
    </div>
  );
}
