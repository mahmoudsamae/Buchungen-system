"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/navigation/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { CompleteLessonDialog } from "@/components/manager/complete-lesson-dialog";
import { useManager } from "@/components/manager/provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { managerFetch } from "@/lib/manager/manager-fetch";
import { hasBookingStarted } from "@/lib/booking/booking-lifecycle";

function StatCard({ label, value, hint }) {
  return (
    <Card className="border-border/70 bg-muted/10 shadow-sm">
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{children}</h2>
      {action}
    </div>
  );
}

export default function StudentProfilePage() {
  const params = useParams();
  const rawStudentId = params?.studentId;
  const studentId =
    typeof rawStudentId === "string" ? rawStudentId : Array.isArray(rawStudentId) ? rawStudentId[0] : "";

  const rawWorkspaceSlug = params?.slug;
  /** URL workspace is source of truth for API tenant; avoids stale context after client navigation. */
  const workspaceSlug =
    typeof rawWorkspaceSlug === "string"
      ? rawWorkspaceSlug
      : Array.isArray(rawWorkspaceSlug)
        ? rawWorkspaceSlug[0] ?? ""
        : "";

  const { business, categories, services, customerActions, bookingActions } = useManager();
  const { t, locale } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const slug = workspaceSlug || business?.slug || "";

  const [notes, setNotes] = useState([]);
  const [noteForm, setNoteForm] = useState({ title: "", content: "", visibility: "internal", isPinned: false });
  const [noteSaving, setNoteSaving] = useState(false);
  const [notesRefreshing, setNotesRefreshing] = useState(false);
  const [noteToast, setNoteToast] = useState("");

  const [internalNoteDraft, setInternalNoteDraft] = useState("");
  const [internalSaving, setInternalSaving] = useState(false);
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountForm, setAccountForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    status: "active",
    categoryId: ""
  });
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [completeFor, setCompleteFor] = useState(null);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    serviceId: "",
    date: "",
    time: "",
    notes: ""
  });

  const loadProfile = useCallback(
    async ({ showSpinner } = { showSpinner: true }) => {
      if (!slug || !studentId) return;
      if (showSpinner) {
        setLoading(true);
        setError("");
      } else {
        setNotesRefreshing(true);
      }
      try {
        const res = await managerFetch(slug, `/api/manager/students/${studentId}`);
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(j.error || "Could not load student.");
          setData(null);
          setNotes([]);
          return;
        }
        setData(j);
        setNotes(Array.isArray(j.notes) ? j.notes : []);
        setInternalNoteDraft(String(j.internalNote || ""));
        setAccountForm({
          fullName: String(j.student?.fullName || ""),
          email: String(j.student?.email || ""),
          phone: String(j.student?.phone || ""),
          status: String(j.student?.status || "active"),
          categoryId: String(j.student?.categoryId || "")
        });
      } finally {
        if (showSpinner) setLoading(false);
        else setNotesRefreshing(false);
      }
    },
    [slug, studentId]
  );

  useEffect(() => {
    loadProfile({ showSpinner: true });
  }, [loadProfile]);

  const student = data?.student || null;
  const stats = data?.stats || {};

  const lastBookingLabel = useMemo(() => {
    if (!stats?.lastBooking?.date) return "—";
    try {
      const lo = locale === "de" ? "de-DE" : "en-US";
      const dt = new Date(`${stats.lastBooking.date}T12:00:00`);
      return `${new Intl.DateTimeFormat(lo, { year: "numeric", month: "short", day: "2-digit" }).format(dt)} · ${stats.lastBooking.time}`;
    } catch {
      return `${stats.lastBooking.date} · ${stats.lastBooking.time || ""}`.trim();
    }
  }, [stats?.lastBooking?.date, stats?.lastBooking?.time, locale]);

  const memberSinceLabel = useMemo(() => {
    const iso = student?.memberSinceISO || "";
    if (!iso) return student?.createdAt || "—";
    try {
      const lo = locale === "de" ? "de-DE" : "en-US";
      return new Intl.DateTimeFormat(lo, { year: "numeric", month: "short", day: "numeric" }).format(new Date(iso));
    } catch {
      return student?.createdAt || "—";
    }
  }, [student?.memberSinceISO, student?.createdAt, locale]);

  const categoryLabel =
    student?.categoryName ||
    (student?.categoryId ? categories.find((c) => c.id === student.categoryId)?.name : null) ||
    (student ? "All categories" : "—");

  const categoryServices = useMemo(() => {
    if (Array.isArray(data?.categoryServices) && data.categoryServices.length) return data.categoryServices;
    if (!student?.categoryId) return [];
    return (services || [])
      .filter((s) => s.is_active && s.categoryId === student.categoryId)
      .map((s) => ({
        id: s.id,
        name: s.name,
        duration: Number(s.duration) || 0,
        price: s.price == null ? null : Number(s.price)
      }));
  }, [data?.categoryServices, services, student?.categoryId]);

  const lessonsCompleted = Number(stats.completedBookings || 0);
  const lessonsTarget = Math.max(
    Number(stats.totalBookings || 0),
    Number(stats.completedBookings || 0) + Number(stats.upcomingBookings || 0),
    1
  );
  const progressPct = Math.max(0, Math.min(100, Math.round((lessonsCompleted / lessonsTarget) * 100)));

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.students.subtitle")} />
      <main className="space-y-6 p-4 pb-10 md:p-6 md:pb-12">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link
              href={`/manager/${business?.slug}/students`}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              ← Back to students
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {loading ? "Loading…" : student?.fullName || "Student"}
            </h1>
          </div>
          {student ? (
            <div className="flex items-center gap-2">
              <StatusBadge value={student.status} />
            </div>
          ) : null}
        </div>

        {error ? (
          <Card className="border-danger/35 bg-danger/5">
            <CardContent className="p-4 text-sm text-danger">{error}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6 text-sm text-muted-foreground">Loading student profile…</CardContent>
          </Card>
        ) : student ? (
          <>
            <section className="space-y-3">
              <SectionTitle>Overview</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total bookings" value={String(stats.totalBookings ?? 0)} hint="All-time for this business" />
                <StatCard label="Completed" value={String(stats.completedBookings ?? 0)} hint="Lessons marked completed" />
                <StatCard label="Upcoming" value={String(stats.upcomingBookings ?? 0)} hint="Pending or confirmed" />
                <StatCard label="Past / closed" value={String(stats.pastBookings ?? 0)} hint="Terminal or cancelled lessons" />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <section>
                  <SectionTitle>Basic information</SectionTitle>
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="space-y-4 p-5 text-sm">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Full name</p>
                          <p className="mt-1 font-medium text-foreground">{student.fullName || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Member since</p>
                          <p className="mt-1 font-medium text-foreground">{memberSinceLabel}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="mt-1 font-medium text-foreground">{student.email || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Phone</p>
                          <p className="mt-1 font-medium text-foreground">{student.phone || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last booking</p>
                          <p className="mt-1 font-medium text-foreground">{lastBookingLabel}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <section>
                  <SectionTitle>Training information</SectionTitle>
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="space-y-4 p-5 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Training category</p>
                        <p className="mt-1 font-medium text-foreground">{categoryLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Training status</p>
                        <p className="mt-1 font-medium capitalize text-foreground">{student.trainingStatus || student.status || "active"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Lessons completed vs required</p>
                        <p className="mt-1 font-medium text-foreground">
                          {lessonsCompleted} / {lessonsTarget}
                        </p>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                      <div className="space-y-2 rounded-md border border-border/70 bg-muted/10 p-3">
                        <p className="text-xs text-muted-foreground">Primary instructor assignment</p>
                        <Select
                          value={student.primaryInstructor?.id || ""}
                          onChange={async (e) => {
                            if (!studentId || !slug) return;
                            const nextId = e.target.value || null;
                            setAssignmentSaving(true);
                            try {
                              const res = await managerFetch(slug, `/api/manager/customers/${studentId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ primaryInstructorUserId: nextId })
                              });
                              const j = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                setNoteToast(j.error || "Could not update instructor assignment.");
                                return;
                              }
                              await loadProfile({ showSpinner: false });
                              setNoteToast("Primary instructor updated.");
                              window.setTimeout(() => setNoteToast(""), 2000);
                            } finally {
                              setAssignmentSaving(false);
                            }
                          }}
                          disabled={assignmentSaving}
                        >
                          <option value="">No primary instructor</option>
                          {(data?.instructors || []).map((ins) => (
                            <option key={ins.id} value={ins.id}>
                              {ins.fullName || ins.email || ins.id}
                            </option>
                          ))}
                        </Select>
                        {student.primaryInstructor?.email ? (
                          <p className="text-xs text-muted-foreground">{student.primaryInstructor.email}</p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <section>
                  <SectionTitle>Lesson management</SectionTitle>
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="space-y-3 p-5">
                      <p className="text-xs text-muted-foreground">
                        Create a booking directly for this student from the profile.
                      </p>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Select
                          value={bookingForm.serviceId}
                          onChange={(e) => setBookingForm((p) => ({ ...p, serviceId: e.target.value }))}
                        >
                          <option value="">Choose service</option>
                          {categoryServices.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.duration}m)
                            </option>
                          ))}
                        </Select>
                        <Input
                          type="date"
                          value={bookingForm.date}
                          onChange={(e) => setBookingForm((p) => ({ ...p, date: e.target.value }))}
                        />
                        <Input
                          type="time"
                          value={bookingForm.time}
                          onChange={(e) => setBookingForm((p) => ({ ...p, time: e.target.value }))}
                        />
                      </div>
                      <Input
                        value={bookingForm.notes}
                        onChange={(e) => setBookingForm((p) => ({ ...p, notes: e.target.value }))}
                        placeholder="Optional note for this lesson"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={
                            bookingSaving ||
                            !bookingForm.serviceId ||
                            !bookingForm.date ||
                            !bookingForm.time
                          }
                          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                          onClick={async () => {
                            if (!studentId) return;
                            setBookingSaving(true);
                            try {
                              const ok = await bookingActions.save({
                                customerUserId: studentId,
                                serviceId: bookingForm.serviceId,
                                date: bookingForm.date,
                                time: bookingForm.time,
                                notes: bookingForm.notes || ""
                              });
                              if (!ok) return;
                              setBookingForm({ serviceId: "", date: "", time: "", notes: "" });
                              await loadProfile({ showSpinner: false });
                            } finally {
                              setBookingSaving(false);
                            }
                          }}
                        >
                          {bookingSaving ? "Creating…" : "+ Add booking / lesson"}
                        </button>
                        {!categoryServices.length ? (
                          <p className="text-xs text-muted-foreground">
                            No active services found for this student category.
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <section>
                  <SectionTitle>Account & profile actions</SectionTitle>
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="space-y-3 p-5">
                      <p className="text-xs text-muted-foreground">
                        Edit student account details here. This profile is now the main management hub.
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          placeholder="Full name"
                          value={accountForm.fullName}
                          onChange={(e) => setAccountForm((p) => ({ ...p, fullName: e.target.value }))}
                        />
                        <Input
                          type="email"
                          placeholder="Sign-in email"
                          value={accountForm.email}
                          onChange={(e) => setAccountForm((p) => ({ ...p, email: e.target.value }))}
                        />
                        <Input
                          placeholder="Phone"
                          value={accountForm.phone}
                          onChange={(e) => setAccountForm((p) => ({ ...p, phone: e.target.value }))}
                        />
                        <Select
                          value={accountForm.status}
                          onChange={(e) => setAccountForm((p) => ({ ...p, status: e.target.value }))}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="suspended">Suspended</option>
                        </Select>
                        <Select
                          value={accountForm.categoryId}
                          onChange={(e) => setAccountForm((p) => ({ ...p, categoryId: e.target.value }))}
                          className="md:col-span-2"
                        >
                          <option value="">All categories</option>
                          {categories.filter((c) => c.is_active).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="New password (optional, min 8 chars)"
                          value={newPw}
                          onChange={(e) => setNewPw(e.target.value)}
                        />
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder="Confirm new password"
                          value={newPw2}
                          onChange={(e) => setNewPw2(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={accountSaving}
                          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                          onClick={async () => {
                            if (!studentId) return;
                            if (newPw || newPw2) {
                              if (newPw.length < 8) {
                                setNoteToast("New password must be at least 8 characters.");
                                return;
                              }
                              if (newPw !== newPw2) {
                                setNoteToast("New password fields do not match.");
                                return;
                              }
                            }
                            setAccountSaving(true);
                            try {
                              const res = await managerFetch(slug, `/api/manager/customers/${studentId}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  fullName: accountForm.fullName.trim(),
                                  email: accountForm.email.trim(),
                                  phone: accountForm.phone.trim(),
                                  status: accountForm.status,
                                  categoryId: accountForm.categoryId || null,
                                  newPassword: newPw || undefined
                                })
                              });
                              const j = await res.json().catch(() => ({}));
                              if (!res.ok) {
                                setNoteToast(j.error || "Could not save account.");
                                return;
                              }
                              setNewPw("");
                              setNewPw2("");
                              await loadProfile({ showSpinner: false });
                              setNoteToast("Account saved.");
                              window.setTimeout(() => setNoteToast(""), 2000);
                            } finally {
                              setAccountSaving(false);
                            }
                          }}
                        >
                          {accountSaving ? "Saving…" : "Save account changes"}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border/80 bg-background/80 px-4 py-2 text-sm hover:bg-muted"
                          onClick={async () => {
                            if (!studentId) return;
                            await customerActions.resetPassword(studentId);
                          }}
                        >
                          Send password recovery email
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <section>
                  <SectionTitle>Membership note (internal)</SectionTitle>
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="space-y-3 p-5">
                      <p className="text-xs text-muted-foreground">
                        Stored on the membership record (legacy quick reference). Only visible to the teacher/manager.
                      </p>
                      <Textarea
                        value={internalNoteDraft}
                        onChange={(e) => setInternalNoteDraft(e.target.value)}
                        rows={4}
                        placeholder="Internal reference for the teacher…"
                        className="bg-background/80"
                      />
                      <button
                        type="button"
                        disabled={internalSaving}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                        onClick={async () => {
                          if (!slug || !studentId) return;
                          setInternalSaving(true);
                          try {
                            const res = await managerFetch(slug, `/api/manager/customers/${studentId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ internalNote: internalNoteDraft })
                            });
                            const j = await res.json().catch(() => ({}));
                            if (!res.ok) {
                              setNoteToast(j.error || "Could not save membership note.");
                              return;
                            }
                            setNoteToast("Membership note saved.");
                            window.setTimeout(() => setNoteToast(""), 2000);
                            await loadProfile({ showSpinner: false });
                          } finally {
                            setInternalSaving(false);
                          }
                        }}
                      >
                        {internalSaving ? "Saving…" : "Save membership note"}
                      </button>
                    </CardContent>
                  </Card>
                </section>
              </div>

              <div className="space-y-6">
                <section>
                  <SectionTitle>Assigned services</SectionTitle>
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="max-h-[260px] space-y-2 overflow-y-auto p-4">
                      {categoryServices.length ? (
                        categoryServices.map((s) => (
                          <div key={s.id} className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {s.duration} min{s.price != null ? ` · $${s.price}` : ""}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          No services assigned through current category.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </section>

                <section>
                  <SectionTitle>Upcoming bookings</SectionTitle>
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="max-h-[340px] space-y-2 overflow-y-auto p-4">
                      {Array.isArray(data?.upcomingBookings) && data.upcomingBookings.length ? (
                        data.upcomingBookings.map((b) => (
                          <div
                            key={b.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/10 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {b.date} ·{" "}
                                <span className="font-mono tabular-nums">
                                  {b.time}
                                  {b.endTime ? `–${b.endTime}` : ""}
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{b.service}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge value={b.status} />
                              {b.status === "pending" ? (
                                <button
                                  type="button"
                                  className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted"
                                  onClick={() => bookingActions.updateStatus(b.id, "confirmed")}
                                >
                                  Accept
                                </button>
                              ) : null}
                              {["pending", "confirmed"].includes(String(b.status)) ? (
                                <button
                                  type="button"
                                  className="rounded-md border border-danger/35 bg-danger/5 px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
                                  onClick={() => bookingActions.updateStatus(b.id, "cancelled_by_manager")}
                                >
                                  Cancel
                                </button>
                              ) : null}
                              {b.status === "confirmed" ? (
                                <button
                                  type="button"
                                  disabled={
                                    !hasBookingStarted(
                                      { booking_date: b.date, start_time: b.time },
                                      business?.timezone || "UTC"
                                    )
                                  }
                                  className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => setCompleteFor(b)}
                                >
                                  Complete
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">No upcoming bookings.</p>
                      )}
                    </CardContent>
                  </Card>
                </section>

                <section>
                  <SectionTitle>Past bookings</SectionTitle>
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="max-h-[340px] space-y-2 overflow-y-auto p-4">
                      {Array.isArray(data?.pastBookings) && data.pastBookings.length ? (
                        data.pastBookings.map((b) => (
                          <div
                            key={b.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/10 px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium">
                                {b.date} ·{" "}
                                <span className="font-mono tabular-nums">
                                  {b.time}
                                  {b.endTime ? `–${b.endTime}` : ""}
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{b.service}</p>
                              {b.lessonNote ? (
                                <p className="mt-2 text-xs text-foreground/85">
                                  <span className="font-medium">Lesson note:</span> {b.lessonNote}
                                </p>
                              ) : null}
                              {b.lessonNextFocus ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  <span className="font-medium">Next focus:</span> {b.lessonNextFocus}
                                </p>
                              ) : null}
                              {b.publicLessonNote ? (
                                <p className="mt-1 text-[11px] text-primary">Visible to student</p>
                              ) : null}
                            </div>
                            <StatusBadge value={b.status} />
                          </div>
                        ))
                      ) : (
                        <p className="py-8 text-center text-sm text-muted-foreground">No past bookings yet.</p>
                      )}
                    </CardContent>
                  </Card>
                </section>
              </div>
            </div>

            <section>
              <SectionTitle>Instructor &amp; student notes</SectionTitle>
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Notes</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Public notes appear in the student portal. Internal notes stay on the manager side.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Visibility</label>
                      <Select
                        value={noteForm.visibility}
                        onChange={(e) => setNoteForm((p) => ({ ...p, visibility: e.target.value }))}
                      >
                        <option value="internal">Internal</option>
                        <option value="public">Public (student-visible)</option>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs text-muted-foreground">Title (optional)</label>
                      <Input
                        value={noteForm.title}
                        onChange={(e) => setNoteForm((p) => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Bring documents"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Content</label>
                    <Textarea
                      value={noteForm.content}
                      onChange={(e) => setNoteForm((p) => ({ ...p, content: e.target.value }))}
                      placeholder="Write a clear, actionable note…"
                      rows={4}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={noteForm.isPinned}
                        onChange={(e) => setNoteForm((p) => ({ ...p, isPinned: e.target.checked }))}
                      />
                      Pin note
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
                        onClick={() => {
                          setNoteForm({ title: "", content: "", visibility: "internal", isPinned: false });
                          setNoteToast("");
                        }}
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        disabled={noteSaving || !noteForm.content.trim()}
                        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                        onClick={async () => {
                          if (!slug || !studentId) return;
                          setNoteSaving(true);
                          setNoteToast("");
                          try {
                            const res = await managerFetch(slug, `/api/manager/students/${studentId}/notes`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                title: noteForm.title,
                                content: noteForm.content.trim(),
                                visibility: noteForm.visibility,
                                is_pinned: noteForm.isPinned
                              })
                            });
                          const j = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            setNoteToast(j.error || `Could not save note (${res.status}).`);
                            return;
                          }
                          if (!j.note) {
                            setNoteToast(j.error || "Server did not return a saved note.");
                            return;
                          }
                            setNoteForm({ title: "", content: "", visibility: "internal", isPinned: false });
                            await loadProfile({ showSpinner: false });
                            setNoteToast("Saved.");
                            window.setTimeout(() => setNoteToast(""), 2000);
                          } finally {
                            setNoteSaving(false);
                          }
                        }}
                      >
                        {noteSaving ? "Saving…" : "Add note"}
                      </button>
                    </div>
                  </div>
                  {noteToast ? <p className="text-xs text-muted-foreground">{noteToast}</p> : null}

                  <div className="border-t border-border/60 pt-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">All notes</p>
                      <button
                        type="button"
                        className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                        onClick={() => loadProfile({ showSpinner: false })}
                        disabled={notesRefreshing}
                      >
                        {notesRefreshing ? "Refreshing…" : "Refresh"}
                      </button>
                    </div>
                    {notes.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                        No notes yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {notes.map((n) => (
                          <div key={n.id} className="rounded-xl border border-border/70 bg-card/80 p-4 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold">{n.title || "Note"}</p>
                                  {n.is_pinned ? (
                                    <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                      Pinned
                                    </span>
                                  ) : null}
                                  <span className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    {n.visibility}
                                  </span>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{n.content}</p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {String(n.created_at || "").replace("T", " ").slice(0, 16)}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="rounded-md border border-border/80 bg-background/80 px-3 py-2 text-xs font-medium hover:bg-muted"
                                  onClick={async () => {
                                    const res = await managerFetch(slug, `/api/manager/students/${studentId}/notes/${n.id}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ is_pinned: !n.is_pinned })
                                    });
                                    if (!res.ok) return;
                                    await loadProfile({ showSpinner: false });
                                  }}
                                >
                                  {n.is_pinned ? "Unpin" : "Pin"}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-md border border-danger/35 bg-danger/5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10"
                                  onClick={async () => {
                                    if (typeof window !== "undefined" && !window.confirm("Archive this note?")) return;
                                    const res = await managerFetch(slug, `/api/manager/students/${studentId}/notes/${n.id}`, {
                                      method: "DELETE"
                                    });
                                    if (!res.ok) return;
                                    await loadProfile({ showSpinner: false });
                                  }}
                                >
                                  Archive
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        ) : (
          <Card className="border-border/70">
            <CardContent className="p-6 text-sm text-muted-foreground">Student not found.</CardContent>
          </Card>
        )}
      </main>
      <CompleteLessonDialog
        open={Boolean(completeFor)}
        booking={completeFor}
        onClose={() => setCompleteFor(null)}
        onSubmit={async (id, payload) => {
          const ok = await bookingActions.completeLesson(id, payload);
          if (ok) {
            setCompleteFor(null);
            await loadProfile({ showSpinner: false });
          }
          return ok;
        }}
      />
    </>
  );
}
