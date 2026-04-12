"use client";

import { useEffect, useMemo, useState } from "react";
import { ManagerDialog } from "@/components/manager/dialog";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
export function ManualBookingDialog({
  open,
  onClose,
  customers,
  services,
  onSave,
  loadAvailableUpcomingSlots
}) {
  const activeServices = useMemo(() => (services || []).filter((s) => s.is_active !== false), [services]);
  const [customerUserId, setCustomerUserId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null); // { date, time }
  const [availabilityDays, setAvailabilityDays] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedSlot(null);
    setAvailabilityDays([]);
    setAvailabilityLoading(false);
    setAvailabilityError("");
    setInternalNote("");
    setSubmitting(false);
    setCustomerUserId("");
    setServiceId("");
    console.info("[booking/create-modal open]", {
      today: localDateString(new Date())
    });
  }, [open, customers, activeServices]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    async function run() {
      if (!customerUserId || !serviceId || typeof loadAvailableUpcomingSlots !== "function") {
        setAvailabilityDays([]);
        setSelectedSlot(null);
        setAvailabilityError("");
        return;
      }
      setAvailabilityLoading(true);
      setAvailabilityError("");
      console.info("[booking/create-modal upcoming-slots request]", { customerUserId, serviceId });
      const res = await loadAvailableUpcomingSlots({ customerUserId, serviceId, horizonDays: 14 });
      if (!active) return;
      setAvailabilityLoading(false);
      if (!res?.ok) {
        setAvailabilityError("Available appointments could not be loaded.");
        setAvailabilityDays([]);
        setSelectedSlot(null);
        return;
      }
      const days = res.days || [];
      setAvailabilityDays(days);
      setSelectedSlot((prev) => {
        if (!prev) return null;
        const exists = days.some((d) => d.date === prev.date && (d.slots || []).some((s) => s.start === prev.time));
        return exists ? prev : null;
      });
      console.info("[booking/create-modal upcoming-slots response]", { daysCount: days.length });
    }
    run();
    return () => {
      active = false;
    };
  }, [open, customerUserId, serviceId, loadAvailableUpcomingSlots]);

  const canSubmit = Boolean(
    customerUserId &&
      serviceId &&
      selectedSlot?.date &&
      selectedSlot?.time &&
      !submitting &&
      !availabilityLoading
  );

  return (
    <ManagerDialog open={open} onClose={onClose} title="New booking">
      <form
        className="space-y-3 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setSubmitting(true);
          try {
            console.info("[booking/create payload]", {
              customerUserId,
              serviceId,
              date: selectedSlot?.date,
              time: selectedSlot?.time
            });
            const ok = await onSave({
              customerUserId,
              serviceId,
              date: selectedSlot.date,
              time: selectedSlot.time,
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
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Available appointments</label>
          {!customerUserId || !serviceId ? (
            <p className="text-xs text-muted-foreground">Select a customer and service to load available appointments</p>
          ) : availabilityLoading ? (
            <p className="text-xs text-muted-foreground">Loading available appointments...</p>
          ) : availabilityDays.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
              No available appointments found in the next 14 days
            </p>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {availabilityDays.map((day) => (
                <div key={day.date} className="rounded-md border border-border/60 p-2">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{day.date}</p>
                  <div className="flex flex-wrap gap-2">
                    {(day.slots || []).map((s) => {
                      const active = selectedSlot?.date === day.date && selectedSlot?.time === s.start;
                      return (
                        <Button
                          key={`${day.date}-${s.start}-${s.end}`}
                          type="button"
                          variant={active ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSlot({ date: day.date, time: s.start })}
                        >
                          {s.start}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!availabilityLoading && availabilityDays.length > 0 && !selectedSlot ? (
            <p className="mt-2 text-xs text-muted-foreground">Choose one appointment slot to continue</p>
          ) : null}
          {availabilityError ? <p className="mt-2 text-xs text-red-300">{availabilityError}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Internal note (optional)</label>
          <Textarea
            value={internalNote}
            onChange={(ev) => setInternalNote(ev.target.value)}
            placeholder="Only visible to the teacher/manager"
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
        {!canSubmit ? (
          <p className="text-xs text-muted-foreground">
            {!customerUserId
              ? "Select a customer to continue."
              : !serviceId
                ? "Select a service to continue."
                : !selectedSlot
                  ? "Choose an available appointment slot to continue."
                  : availabilityLoading
                    ? "Wait until availability loading finishes."
                    : ""}
          </p>
        ) : null}
      </form>
    </ManagerDialog>
  );
}
