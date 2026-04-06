"use client";

import { useEffect, useState } from "react";
import { ManagerDialog } from "@/components/manager/dialog";
import { Input } from "@/components/ui/input";

/**
 * Manager: move booking to a new date/time (writes reschedule history server-side).
 */
export function RescheduleBookingDialog({ open, onClose, booking, onReschedule }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !booking) return;
    setDate(booking.date || "");
    setTime(booking.time || "09:00");
    setSubmitting(false);
  }, [open, booking]);

  if (!booking) return null;

  const canSubmit = Boolean(date && time && !submitting);

  return (
    <ManagerDialog open={open} onClose={onClose} title="Reschedule booking">
      <p className="text-xs text-muted-foreground">
        Current slot: {booking.date} · {booking.time} — {booking.customer}
      </p>
      <form
        className="mt-3 space-y-3 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setSubmitting(true);
          try {
            const ok = await onReschedule(booking.id, { date, time });
            if (ok) onClose();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">New date</label>
            <Input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">New start time</label>
            <Input type="time" value={time} onChange={(ev) => setTime(ev.target.value)} required />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Save new time
          </button>
        </div>
      </form>
    </ManagerDialog>
  );
}
