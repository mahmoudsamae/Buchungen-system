"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ManagerDialog } from "@/components/manager/dialog";
import { useLanguage } from "@/components/i18n/language-provider";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { StatusBadge } from "@/components/shared/status-badge";
import { TeacherManualBookingDialog } from "@/components/teacher/teacher-manual-booking-dialog";
import { CompleteLessonDialog } from "@/components/manager/complete-lesson-dialog";
import { BOOKING_STATUSES } from "@/lib/manager/booking-constants";

export function TeacherBookingsClient({ schoolSlug }) {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [completeBooking, setCompleteBooking] = useState(null);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [resDate, setResDate] = useState("");
  const [resTime, setResTime] = useState("09:00");
  const [resBusy, setResBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    const path = `/api/teacher/bookings${qs.toString() ? `?${qs}` : ""}`;
    const [bRes, sRes, vRes] = await Promise.all([
      teacherFetch(schoolSlug, path),
      teacherFetch(schoolSlug, "/api/teacher/students"),
      teacherFetch(schoolSlug, "/api/teacher/services")
    ]);
    const bJson = await bRes.json().catch(() => ({}));
    const sJson = await sRes.json().catch(() => ({}));
    const vJson = await vRes.json().catch(() => ({}));
    if (!bRes.ok) {
      setError(bJson.error || t("teacher.bookings.loadError"));
      setBookings([]);
    } else {
      setBookings(bJson.bookings || []);
    }
    if (sRes.ok) setStudents(sJson.students || []);
    if (vRes.ok) setServices(vJson.services || []);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("teacher.bookings.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("teacher.bookings.subtitle")}</p>
        </div>
        <Button type="button" className="gap-2 rounded-xl" onClick={() => setManualOpen(true)}>
          <Plus className="h-4 w-4" />
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
                      <div className="flex flex-wrap gap-2">
                        {b.status === "pending" && (b.bookingSource === "student_request" || b.bookingSource === "portal") ? (
                          <>
                            <button
                              type="button"
                              className="text-xs font-medium text-emerald-400 hover:underline"
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
                            </button>
                            <button
                              type="button"
                              className="text-xs font-medium text-danger hover:underline"
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
                              Reject
                            </button>
                          </>
                        ) : null}
                        {b.status === "confirmed" ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-primary hover:underline"
                            onClick={() => setCompleteBooking(b)}
                          >
                            {t("teacher.bookings.complete")}
                          </button>
                        ) : null}
                        {["pending", "confirmed"].includes(b.status) ? (
                          <>
                            <button
                              type="button"
                              className="text-xs font-medium text-muted-foreground hover:underline"
                              onClick={() => {
                                setRescheduleBooking(b);
                                setResDate(b.date);
                                setResTime(b.time);
                              }}
                            >
                              {t("teacher.bookings.reschedule")}
                            </button>
                            <button
                              type="button"
                              className="text-xs font-medium text-danger hover:underline"
                              onClick={async () => {
                                if (!confirm("Cancel this booking?")) return;
                                const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${b.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: "cancelled_by_manager" })
                                });
                                if (res.ok) await load();
                              }}
                            >
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
        services={services}
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
          if (!res.ok) return false;
          await load();
          return true;
        }}
      />

      <ManagerDialog
        open={Boolean(rescheduleBooking)}
        onClose={() => setRescheduleBooking(null)}
        title={t("teacher.bookings.reschedule")}
      >
        {rescheduleBooking ? (
          <form
            className="space-y-3 text-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              setResBusy(true);
              const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/${rescheduleBooking.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: resDate, time: resTime })
              });
              setResBusy(false);
              if (res.ok) {
                setRescheduleBooking(null);
                await load();
              }
            }}
          >
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Date</span>
              <Input type="date" value={resDate} onChange={(e) => setResDate(e.target.value)} required className="rounded-xl" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Start time</span>
              <Input type="time" value={resTime} onChange={(e) => setResTime(e.target.value)} required className="rounded-xl" />
            </label>
            <Button type="submit" className="w-full rounded-xl" disabled={resBusy}>
              {resBusy ? "…" : "Save"}
            </Button>
          </form>
        ) : null}
      </ManagerDialog>
    </div>
  );
}
