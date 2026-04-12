"use client";

import { useEffect, useState } from "react";
import { ManagerDialog } from "@/components/manager/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

/**
 * Manager: move booking to a new date/time (writes reschedule history server-side).
 */
export function RescheduleBookingDialog({
  open,
  onClose,
  booking,
  onReschedule,
  loadAvailableSlots,
  loadAvailableDates
}) {
  const [availableDates, setAvailableDates] = useState([]);
  const [datesLoading, setDatesLoading] = useState(false);
  const [datesError, setDatesError] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slotItems, setSlotItems] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsReason, setSlotsReason] = useState(null);
  const [slotsError, setSlotsError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !booking) return;
    setDate(booking.date || "");
    setTime("");
    setAvailableDates([]);
    setDatesLoading(false);
    setDatesError("");
    setSlotItems([]);
    setSlotsLoading(false);
    setSlotsReason(null);
    setSlotsError("");
    setSubmitting(false);
    console.info("[booking/reschedule-modal open]", { booking });
  }, [open, booking]);

  useEffect(() => {
    if (!open || !booking) return;
    let active = true;
    async function runDates() {
      if (!booking.customerUserId || !booking.serviceId || typeof loadAvailableDates !== "function") return;
      console.info("[booking/reschedule-modal dates request]", {
        bookingId: booking.id,
        customerUserId: booking.customerUserId,
        serviceId: booking.serviceId
      });
      setDatesLoading(true);
      setDatesError("");
      const res = await loadAvailableDates({
        customerUserId: booking.customerUserId,
        serviceId: booking.serviceId,
        fromDate: booking.date,
        horizonDays: 30,
        excludeBookingId: booking.id
      });
      if (!active) return;
      setDatesLoading(false);
      if (!res?.ok) {
        setDatesError("Availability could not be loaded. Please try again.");
        setAvailableDates([]);
        return;
      }
      const dates = res.dates || [];
      setAvailableDates(dates);
      setDate((prev) => (dates.includes(prev) ? prev : dates[0] || ""));
      console.info("[booking/reschedule-modal dates response]", { bookingId: booking.id, datesCount: dates.length });
    }
    runDates();
    return () => {
      active = false;
    };
  }, [open, booking, loadAvailableDates]);

  useEffect(() => {
    if (!open || !booking) return;
    let active = true;
    async function run() {
      if (!date || !booking.customerUserId || !booking.serviceId || typeof loadAvailableSlots !== "function") {
        setSlotItems([]);
        setTime("");
        setSlotsReason(null);
        setSlotsError("");
        return;
      }
      setSlotsLoading(true);
      setSlotsError("");
      const res = await loadAvailableSlots({
        date,
        customerUserId: booking.customerUserId,
        serviceId: booking.serviceId,
        excludeBookingId: booking.id
      });
      if (!active) return;
      setSlotsLoading(false);
      if (!res?.ok) {
        setSlotsError("Available times could not be loaded for this date.");
      }
      const slots = res?.ok ? res.slots || [] : [];
      console.info("[booking/reschedule-modal slots response]", {
        bookingId: booking.id,
        date,
        serviceId: booking.serviceId,
        count: slots.length,
        reason: res?.reason || null
      });
      setSlotItems(slots);
      setSlotsReason(res?.reason || null);
      setTime((prev) => (slots.some((s) => s.start === prev) ? prev : ""));
    }
    run();
    return () => {
      active = false;
    };
  }, [open, booking, date, loadAvailableSlots]);

  if (!booking) return null;

  const isSameSlot = String(date || "") === String(booking?.date || "") && String(time || "") === String(booking?.time || "");
  const canSubmit = Boolean(
    booking?.id &&
      booking?.serviceId &&
      booking?.customerUserId &&
      date &&
      time &&
      !submitting &&
      !slotsLoading &&
      !datesLoading &&
      !isSameSlot
  );

  return (
    <ManagerDialog open={open} onClose={onClose} title="Reschedule booking">
      <p className="text-xs text-muted-foreground">
        Current slot: {booking.date} · {booking.time} — {booking.customer}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Booking ID: {booking.id}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Rescheduling lesson for <strong>{booking.customer}</strong> ({booking.service}).
      </p>
      {!booking.serviceId ? (
        <p className="mt-2 rounded-md border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
          Service information is missing for this booking. Reschedule cannot continue.
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="mb-1 block font-medium text-muted-foreground">Customer (read-only)</label>
          <Input value={booking.customer || ""} readOnly />
        </div>
        <div>
          <label className="mb-1 block font-medium text-muted-foreground">Service (read-only)</label>
          <Input value={booking.service || ""} readOnly />
        </div>
      </div>
      <form
        className="mt-3 space-y-3 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!canSubmit) return;
          setSubmitting(true);
          try {
            console.info("[booking/reschedule payload]", {
              bookingId: booking.id,
              oldDate: booking.date,
              oldTime: booking.time,
              newDate: date,
              newTime: time
            });
            const ok = await onReschedule(booking.id, { date, time });
            if (ok) onClose();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">New date (available only)</label>
          {datesLoading ? (
            <p className="text-xs text-muted-foreground">Loading available dates...</p>
          ) : availableDates.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
              No available dates found in the next 30 days
            </p>
          ) : (
            <Select value={date} onChange={(ev) => setDate(ev.target.value)}>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          )}
          {datesError ? <p className="mt-2 text-xs text-red-300">{datesError}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Available times</label>
          {!date ? (
            <p className="text-xs text-muted-foreground">Select a date to load available times</p>
          ) : slotsLoading ? (
            <p className="text-xs text-muted-foreground">Loading available times...</p>
          ) : slotItems.length === 0 ? (
            <p className="rounded-md border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground">
              {slotsReason === "closed" ? "No available slots for this date (business closed)." : "No available slots for this date"}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slotItems.map((s) => (
                <Button
                  key={`${s.start}-${s.end}`}
                  type="button"
                  variant={time === s.start ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTime(s.start)}
                >
                  {s.start}
                </Button>
              ))}
            </div>
          )}
          {date && !slotsLoading && slotItems.length > 0 && !time ? (
            <p className="mt-2 text-xs text-muted-foreground">Choose a time to continue</p>
          ) : null}
          {slotsError ? <p className="mt-2 text-xs text-red-300">{slotsError}</p> : null}
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
        {!canSubmit ? (
          <p className="text-xs text-muted-foreground">
            {!booking?.serviceId
              ? "Service data missing for this booking."
              : !date
              ? "Select an available date to continue."
              : !time
                ? "Choose an available time to continue."
                : isSameSlot
                  ? "Choose a different slot than the current one."
                : ""}
          </p>
        ) : null}
      </form>
    </ManagerDialog>
  );
}
