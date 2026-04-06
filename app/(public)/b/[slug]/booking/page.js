"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

const SLOT_RANGES = ["08:00 - 09:30", "10:00 - 11:30", "12:00 - 13:30", "14:00 - 15:30", "16:00 - 17:30"];
const PREBOOKED = {
  0: ["10:00 - 11:30"],
  1: ["08:00 - 09:30"],
  2: ["14:00 - 15:30"],
  3: ["16:00 - 17:30"],
  4: []
};

function formatHeaderDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function getWeekdays() {
  const days = [];
  const now = new Date();
  const date = new Date(now);
  while (days.length < 5) {
    const day = date.getDay();
    if (day >= 1 && day <= 5) {
      days.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export default function BookingLandingPage() {
  const [loading, setLoading] = useState(true);
  const [bookedMap, setBookedMap] = useState(PREBOOKED);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState("");
  const weekdays = useMemo(() => getWeekdays(), []);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 850);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const confirmBooking = () => {
    if (!selected) return;
    setBookedMap((prev) => ({
      ...prev,
      [selected.dayIndex]: [...(prev[selected.dayIndex] || []), selected.slot]
    }));
    setToast(`Booked ${selected.slot} on ${selected.dayLabel}`);
    setSelected(null);
  };

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute -top-12 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/25 blur-[100px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-56 w-56 rounded-full bg-info/20 blur-[100px]" />

      <header className="sticky top-0 z-20 mb-6 flex items-center justify-between border-b bg-background/85 px-1 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-primary to-info text-xs font-bold text-white">BF</div>
          <p className="font-semibold">BookFlow</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-xs font-medium">DU</div>
      </header>

      <section className="mb-6">
        <h1 className="text-2xl font-semibold md:text-3xl">Book Your Appointment</h1>
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          {formatHeaderDate(today)}
        </p>
      </section>

      <section className="space-y-4 pb-8">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="rounded-xl p-4">
                <div className="h-5 w-52 animate-pulse rounded bg-muted" />
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="h-14 animate-pulse rounded bg-muted" />
                  <div className="h-14 animate-pulse rounded bg-muted" />
                </div>
              </Card>
            ))
          : weekdays.map((day, dayIndex) => {
              const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(day);
              return (
                <Card key={dayLabel} className="rounded-xl p-4 shadow-soft transition hover:shadow-card">
                  <h2 className="text-base font-semibold">{dayLabel}</h2>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {SLOT_RANGES.map((slot) => {
                      const isBooked = (bookedMap[dayIndex] || []).includes(slot);
                      return (
                        <div key={slot} className={`flex items-center justify-between rounded-lg border p-3 transition ${isBooked ? "bg-muted/50" : "bg-card hover:border-primary/50 hover:bg-muted/30"}`}>
                          <p className="inline-flex items-center gap-2 text-sm">
                            <Clock3 className="h-4 w-4 text-muted-foreground" />
                            {slot}
                          </p>
                          <button
                            disabled={isBooked}
                            onClick={() => setSelected({ dayIndex, dayLabel, slot })}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                              isBooked
                                ? "cursor-not-allowed bg-muted text-muted-foreground"
                                : "bg-primary text-primary-foreground hover:opacity-90"
                            }`}
                          >
                            {isBooked ? "Booked" : "Book"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-md rounded-xl p-5">
            <p className="inline-flex items-center gap-2 text-xs text-primary"><Sparkles className="h-4 w-4" />Confirm booking</p>
            <h3 className="mt-2 text-lg font-semibold">{selected.dayLabel}</h3>
            <p className="mt-1 text-sm text-muted-foreground">Time: {selected.slot}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setSelected(null)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
                Cancel
              </button>
              <button onClick={confirmBooking} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Confirm
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border bg-card px-4 py-3 text-sm shadow-card">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
