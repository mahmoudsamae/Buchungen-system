"use client";

import { useEffect, useMemo, useState } from "react";
import { ManagerDialog } from "@/components/manager/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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

export function TeacherManualBookingDialog({ open, onClose, title, schoolSlug, students, services, onCreated }) {
  const activeServices = useMemo(() => (services || []).filter((s) => s.is_active !== false), [services]);
  const [customerUserId, setCustomerUserId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setCustomerUserId("");
    setServiceId("");
    setDate("");
    setTime("09:00");
    setNotes("");
    setSubmitting(false);
    setError("");
    const t = new Date();
    setDate(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`);
  }, [open]);

  const canSubmit = Boolean(customerUserId && serviceId && date && time && !submitting);

  return (
    <ManagerDialog open={open} onClose={onClose} title={title} wide>
      <form
        className="grid gap-3 text-sm sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setSubmitting(true);
          setError("");
          const res = await teacherFetch(schoolSlug, "/api/teacher/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerUserId,
              serviceId,
              booking_date: date,
              start_time: time,
              notes: notes.trim() || undefined
            })
          });
          const json = await res.json().catch(() => ({}));
          setSubmitting(false);
          if (!res.ok) {
            setError(json.error || "Could not create booking.");
            return;
          }
          onCreated?.(json.booking);
          onClose();
        }}
      >
        <Field label="Student">
          <Select value={customerUserId} onChange={(e) => setCustomerUserId(e.target.value)}>
            <option value="">—</option>
            {(students || []).map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.fullName || s.email}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Service">
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">—</option>
            {activeServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration_minutes} min)
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Start time">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes (optional)">
            <textarea
              className={cn(
                "min-h-[72px] w-full rounded-md border bg-card px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
              )}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>
        {error ? <p className="sm:col-span-2 text-xs text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {submitting ? "…" : "Create"}
          </Button>
        </div>
      </form>
    </ManagerDialog>
  );
}
