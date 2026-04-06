"use client";

import { useEffect, useMemo, useState } from "react";
import { ManagerDialog } from "@/components/manager/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { localDateString } from "@/lib/manager/booking-date-utils";

function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "min-h-[88px] w-full rounded-md border bg-card px-3 py-2 text-sm outline-none ring-primary placeholder:text-muted-foreground focus:ring-2",
        className
      )}
      {...props}
    />
  );
}

/**
 * Manager-only: create a booking (customer + service + date/time + optional internal note).
 */
export function ManualBookingDialog({ open, onClose, customers, services, defaultDate, onSave }) {
  const activeServices = useMemo(() => (services || []).filter((s) => s.is_active !== false), [services]);
  const [customerUserId, setCustomerUserId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [internalNote, setInternalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(defaultDate || localDateString(new Date()));
    setTime("09:00");
    setInternalNote("");
    setSubmitting(false);
    const firstCust = customers?.[0]?.id;
    setCustomerUserId(firstCust || "");
    const firstSvc = activeServices[0]?.id;
    setServiceId(firstSvc || "");
  }, [open, defaultDate, customers, activeServices]);

  const canSubmit = Boolean(customerUserId && serviceId && date && time && !submitting);

  return (
    <ManagerDialog open={open} onClose={onClose} title="New booking">
      <form
        className="space-y-3 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setSubmitting(true);
          try {
            const ok = await onSave({
              customerUserId,
              serviceId,
              date,
              time,
              internalNote: internalNote.trim() || undefined
            });
            if (ok) onClose();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Customer</label>
          <Select value={customerUserId} onChange={(ev) => setCustomerUserId(ev.target.value)} required>
            <option value="">Select customer</option>
            {(customers || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName || c.email || c.id}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Service</label>
          <Select value={serviceId} onChange={(ev) => setServiceId(ev.target.value)} required>
            <option value="">Select service</option>
            {activeServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration ?? s.duration_minutes} min)
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
            <Input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Start time</label>
            <Input type="time" value={time} onChange={(ev) => setTime(ev.target.value)} required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Internal note (optional)</label>
          <Textarea
            value={internalNote}
            onChange={(ev) => setInternalNote(ev.target.value)}
            placeholder="Visible to your team only"
          />
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
            Save booking
          </button>
        </div>
      </form>
    </ManagerDialog>
  );
}
