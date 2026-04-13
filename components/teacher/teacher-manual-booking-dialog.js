"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ManagerDialog } from "@/components/manager/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { cn } from "@/lib/utils";

function Field({ label, children }) {
  return (
    <label className="block space-y-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/** Next-available + browse horizon for manual booking (days from today, business TZ on server). */
const SLOT_HORIZON_DAYS = 10;

export function TeacherManualBookingDialog({ open, onClose, title, schoolSlug, students, onCreated }) {
  const roster = useMemo(() => (Array.isArray(students) ? students : []), [students]);

  const [customerUserId, setCustomerUserId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadSlotsError, setLoadSlotsError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const [slotsLoading, setSlotsLoading] = useState(false);
  const [dayLoading, setDayLoading] = useState(false);
  const [nextSlots, setNextSlots] = useState([]);
  const [browseDates, setBrowseDates] = useState([]);
  const [browseDay, setBrowseDay] = useState("");
  const [daySlots, setDaySlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (!open) return;
    setCustomerUserId(roster.length === 1 ? String(roster[0].userId) : "");
    setNotes("");
    setSubmitting(false);
    setLoadSlotsError("");
    setSubmitError("");
    setSlotsLoading(false);
    setDayLoading(false);
    setNextSlots([]);
    setBrowseDates([]);
    setBrowseDay("");
    setDaySlots([]);
    setSelectedSlot(null);
  }, [open, roster]);

  useEffect(() => {
    if (!open || !customerUserId) {
      setNextSlots([]);
      setBrowseDates([]);
      setBrowseDay("");
      setDaySlots([]);
      setSelectedSlot(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      setLoadSlotsError("");
      setSubmitError("");
      setSelectedSlot(null);
      setBrowseDay("");
      setDaySlots([]);
      const base = new URLSearchParams({ customerUserId });
      const h = String(SLOT_HORIZON_DAYS);
      const [rNext, rBrowse] = await Promise.all([
        teacherFetch(schoolSlug, `/api/teacher/bookings/reschedule-slots?${base}&next=16&horizonDays=${h}`),
        teacherFetch(schoolSlug, `/api/teacher/bookings/reschedule-slots?${base}&browseDates=1&horizonDays=${h}`)
      ]);
      const jNext = await rNext.json().catch(() => ({}));
      const jBrowse = await rBrowse.json().catch(() => ({}));
      if (cancelled) return;
      if (!rNext.ok) {
        setLoadSlotsError(typeof jNext.error === "string" ? jNext.error : "Could not load available slots.");
        setNextSlots([]);
      } else {
        setNextSlots(Array.isArray(jNext.nextSlots) ? jNext.nextSlots : []);
      }
      if (rBrowse.ok && Array.isArray(jBrowse.dates)) {
        setBrowseDates(jBrowse.dates);
      } else {
        setBrowseDates([]);
      }
      setSlotsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerUserId, schoolSlug]);

  const loadDaySlots = useCallback(
    async (dateStr) => {
      if (!customerUserId || !dateStr) return;
      setDayLoading(true);
      setLoadSlotsError("");
      const qs = new URLSearchParams({ customerUserId, date: dateStr });
      const res = await teacherFetch(schoolSlug, `/api/teacher/bookings/reschedule-slots?${qs}`);
      const j = await res.json().catch(() => ({}));
      setDayLoading(false);
      if (!res.ok) {
        setLoadSlotsError(typeof j.error === "string" ? j.error : "Could not load slots for that day.");
        setDaySlots([]);
        return;
      }
      setDaySlots(Array.isArray(j.slots) ? j.slots : []);
    },
    [customerUserId, schoolSlug]
  );

  const canSubmit = Boolean(customerUserId && selectedSlot && !submitting && !slotsLoading);

  return (
    <ManagerDialog open={open} onClose={onClose} title={title} wide>
      <form
        className="space-y-4 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit || !selectedSlot) return;
          setSubmitting(true);
          setSubmitError("");
          const res = await teacherFetch(schoolSlug, "/api/teacher/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerUserId,
              booking_date: selectedSlot.date,
              start_time: selectedSlot.start,
              end_time: selectedSlot.end,
              notes: notes.trim() || undefined
            })
          });
          const json = await res.json().catch(() => ({}));
          setSubmitting(false);
          if (!res.ok) {
            setSubmitError(typeof json.error === "string" ? json.error : "Could not create booking.");
            return;
          }
          onCreated?.(json.booking);
          onClose();
        }}
      >
        <Field label="Student">
          <Select value={customerUserId} onChange={(e) => setCustomerUserId(e.target.value)}>
            <option value="">Select a student…</option>
            {roster.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.fullName || s.email}
              </option>
            ))}
          </Select>
        </Field>

        {!customerUserId ? (
          <p className="rounded-xl border border-border/60 bg-zinc-950/40 px-3 py-2.5 text-xs text-muted-foreground">
            Choose a student to load available slots for the next {SLOT_HORIZON_DAYS} days.
          </p>
        ) : slotsLoading ? (
          <p className="text-xs text-muted-foreground">Loading available slots…</p>
        ) : (
          <>
            {loadSlotsError ? (
              <div className="rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-xs text-amber-100" role="alert">
                {loadSlotsError}
              </div>
            ) : null}
            {submitError ? (
              <div className="rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-xs text-amber-100" role="alert">
                {submitError}
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next available slots</p>
              {!loadSlotsError && nextSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No openings in the quick list for the next {SLOT_HORIZON_DAYS} days. Try browsing by day below.
                </p>
              ) : loadSlotsError ? null : (
                <div className="flex flex-wrap gap-2">
                  {nextSlots.map((s) => {
                    const key = `${s.date}-${s.start}-${s.end}`;
                    const active =
                      selectedSlot &&
                      selectedSlot.date === s.date &&
                      selectedSlot.start === s.start &&
                      selectedSlot.end === s.end;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedSlot({ date: s.date, start: s.start, end: s.end });
                          setSubmitError("");
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
                value={browseDay}
                onChange={(e) => {
                  const v = e.target.value;
                  setBrowseDay(v);
                  setSubmitError("");
                  if (v) loadDaySlots(v);
                  else setDaySlots([]);
                }}
              >
                <option value="">Select a date…</option>
                {browseDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
              {dayLoading ? (
                <p className="text-xs text-muted-foreground">Loading slots…</p>
              ) : browseDay && daySlots.length === 0 && !loadSlotsError ? (
                <p className="text-xs text-muted-foreground">No bookable windows on this day.</p>
              ) : browseDay ? (
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((s) => {
                    const key = `${browseDay}-${s.start}-${s.end}`;
                    const active =
                      selectedSlot &&
                      selectedSlot.date === browseDay &&
                      selectedSlot.start === s.start &&
                      selectedSlot.end === s.end;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedSlot({ date: browseDay, start: s.start, end: s.end });
                          setSubmitError("");
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
          </>
        )}

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Note (optional)</span>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Visible on the booking…"
            rows={2}
            className="min-h-[64px] rounded-xl border-border/60 bg-background/50 text-sm"
          />
        </label>

        {customerUserId && !slotsLoading && selectedSlot ? (
          <p className="text-[11px] text-muted-foreground">
            Selected: {selectedSlot.date} · {selectedSlot.start}–{selectedSlot.end}
          </p>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/40 pt-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="rounded-xl" disabled={!canSubmit}>
            {submitting ? "Saving…" : "Create booking"}
          </Button>
        </div>
      </form>
    </ManagerDialog>
  );
}
