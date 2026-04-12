"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { customerUiBasePath } from "@/lib/portal/customer-base-path";
import { Card } from "@/components/ui/card";
import { CalendarDays, Clock3 } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";

function nextWeekdays(count = 5) {
  const out = [];
  const d = new Date();
  while (out.length < count) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function normalizeSlot(s, slotDurationMinutes) {
  if (s && typeof s === "object" && s.start && s.end) return s;
  if (typeof s === "string") {
    const end = addMinutesLabel(s, slotDurationMinutes);
    return { start: s, end: end || "—" };
  }
  return { start: "—", end: "—" };
}

function addMinutesLabel(hhmm, minutes) {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  if (nh >= 24) return null;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

/** Local calendar YYYY-MM-DD — must match the day chip the user sees (do not use toISOString()). */
function formatLocalDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmdLocal(ymd) {
  const [y, m, d] = String(ymd || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function daysFromRange(startYmd, endYmd) {
  const start = parseYmdLocal(startYmd);
  const end = parseYmdLocal(endYmd);
  if (!start || !end || start > end) return [];
  const out = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function messageForBookingError(code, fallback, t) {
  switch (String(code || "")) {
    case "DAILY_LIMIT_REACHED":
      return "You have reached the maximum number of bookings for this day.";
    case "WEEKLY_LIMIT_REACHED":
      return "You have reached the maximum number of bookings for this week.";
    case "SLOT_ALREADY_BOOKED":
      return "This slot is already booked.";
    case "SLOT_RESERVED_BY_ANOTHER_USER":
      return "This slot is currently reserved by another user.";
    case "SLOT_ALREADY_PENDING_FOR_THIS_USER":
      return "You already have this slot pending.";
    case "BOOKING_WINDOW_CLOSED":
      return fallback || "Booking window is currently closed.";
    default:
      return fallback || t("portal.book.toastError");
  }
}

export default function PortalBookPage() {
  const { slug } = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const base = customerUiBasePath(pathname, slug);
  const { t, locale } = useLanguage();
  const dateLocale = locale === "de" ? "de-DE" : "en-US";
  const [selectedDay, setSelectedDay] = useState(() => nextWeekdays(5)[0]);
  const [slots, setSlots] = useState([]);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(30);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState(null);
  const [toast, setToast] = useState("");
  const [experience, setExperience] = useState(null);
  const [remainingSlots, setRemainingSlots] = useState(null);
  const [slotsEmptyReason, setSlotsEmptyReason] = useState(null);
  const [bookingWindow, setBookingWindow] = useState(null);

  const dateStr = useMemo(() => formatLocalDateString(selectedDay), [selectedDay]);
  const days = useMemo(() => {
    if (bookingWindow?.start && bookingWindow?.end) return daysFromRange(bookingWindow.start, bookingWindow.end);
    return nextWeekdays(5);
  }, [bookingWindow]);

  const slotsEmptyMessage = useMemo(() => {
    switch (slotsEmptyReason) {
      case "date_in_past":
        return t("portal.book.empty.dateInPast");
      case "closed":
        return t("portal.book.empty.closed");
      case "all_times_passed_today":
        return t("portal.book.empty.allTimesPassedToday");
      case "no_windows":
        return t("portal.book.empty.noWindows");
      default:
        return t("portal.book.noSlots");
    }
  }, [slotsEmptyReason, t]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/portal/${slug}/experience`);
      if (res.status === 401) {
        router.replace(`/portal/${slug}/login?next=/portal/${slug}/book`);
        return;
      }
      if (!res.ok) return;
      const exp = await res.json();
      setExperience(exp);
      setBookingWindow(exp.booking_window || null);
    })();
  }, [slug, router, base]);

  useEffect(() => {
    if (!days.length) return;
    const selected = formatLocalDateString(selectedDay);
    const inRange = days.some((d) => formatLocalDateString(d) === selected);
    if (!inRange) setSelectedDay(days[0]);
  }, [days, selectedDay]);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/portal/${slug}/slots?date=${dateStr}`);
    if (res.status === 401) {
      router.replace(`/portal/${slug}/login?next=/portal/${slug}/book`);
      return;
    }
    if (!res.ok) {
      setSlots([]);
      setSlotsEmptyReason(null);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setBusinessName(data.business?.name || "");
    const dur = data.business?.slot_duration_minutes || 30;
    setSlotDurationMinutes(dur);
    const raw = data.slots || [];
    setSlots(raw.map((s) => normalizeSlot(s, dur)));
    setRemainingSlots(typeof data.remaining_open_slots === "number" ? data.remaining_open_slots : null);
    setSlotsEmptyReason(typeof data.slots_empty_reason === "string" ? data.slots_empty_reason : null);
    setLoading(false);
  }, [slug, dateStr, router, base]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const confirm = async () => {
    if (!pick) return;
    const res = await fetch(`/api/portal/${slug}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_date: dateStr, start_time: pick.start, end_time: pick.end })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setToast(messageForBookingError(e.code, typeof e.error === "string" ? e.error : "", t));
      return;
    }
    setToast(t("portal.book.toastBooked"));
    setPick(null);
    loadSlots();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("portal.book.with")}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{businessName || slug}</h1>
      </header>

      <p className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        {t("portal.book.chooseDay")}
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        {days.map((d) => {
          const label = new Intl.DateTimeFormat(dateLocale, { weekday: "short", month: "short", day: "numeric" }).format(d);
          const active = d.toDateString() === selectedDay.toDateString();
          return (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`rounded-md border px-3 py-2 text-sm ${active ? "border-primary bg-primary/10" : "hover:bg-muted"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {experience &&
      ((experience.show_booking_policy_at_checkout && experience.booking_policy?.trim()) ||
        (experience.show_cancellation_policy_at_checkout && experience.cancellation_policy?.trim())) ? (
        <Card className="mb-5 rounded-xl border-border/70 bg-muted/10 p-4 shadow-sm">
          <h2 className="text-sm font-semibold">{t("portal.book.policiesTitle")}</h2>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-muted-foreground">
            {experience.show_booking_policy_at_checkout && experience.booking_policy?.trim() ? (
              <p className="whitespace-pre-wrap text-foreground/90">{experience.booking_policy.trim()}</p>
            ) : null}
            {experience.show_cancellation_policy_at_checkout && experience.cancellation_policy?.trim() ? (
              <p className="whitespace-pre-wrap text-foreground/90">{experience.cancellation_policy.trim()}</p>
            ) : null}
          </div>
        </Card>
      ) : null}
      {bookingWindow?.mode === "next_week_only" ? (
        <p className="mb-4 text-xs text-muted-foreground">
          {t("portal.book.window.nextWeekHint", { start: bookingWindow.start, end: bookingWindow.end })}
        </p>
      ) : null}

      <Card className="rounded-xl border-border/80 p-4 shadow-card">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-sm font-semibold">{t("portal.book.availableTitle")}</h2>
          {remainingSlots != null ? (
            <p className="text-xs font-medium text-primary">{t("portal.book.slotsRemaining", { count: remainingSlots })}</p>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("portal.book.slotHelp", { min: slotDurationMinutes })}</p>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("portal.book.loading")}</p>
        ) : slots.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{slotsEmptyMessage}</p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {slots.map((s) => {
              const label = `${s.start}–${s.end}`;
              return (
                <button
                  key={`${s.start}-${s.end}`}
                  type="button"
                  onClick={() => setPick({ start: s.start, end: s.end })}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-card p-3 text-left text-sm transition hover:border-primary/40 hover:bg-muted/20"
                >
                  <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                    <Clock3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium tabular-nums">{label}</span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-primary">{t("portal.book.bookAction")}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {pick ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4">
          <Card className="w-full max-w-sm space-y-4 border-border/80 p-5 shadow-card">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("portal.book.confirmTitle")}</p>
            <p className="text-xs text-muted-foreground">{dateStr}</p>
            <p className="text-lg font-semibold leading-snug tabular-nums">
              {t("portal.book.confirmPrompt", { start: pick.start, end: pick.end })}
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>{t("portal.book.confirmBody")}</p>
              {experience?.show_booking_policy_at_checkout && experience?.booking_policy?.trim() ? (
                <p className="whitespace-pre-wrap border-t border-border/50 pt-2 text-[11px] leading-snug">
                  {experience.booking_policy.trim()}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="rounded-md border px-3 py-2 text-sm" onClick={() => setPick(null)}>
                {t("common.cancel")}
              </button>
              <button type="button" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" onClick={confirm}>
                {t("common.confirm")}
              </button>
            </div>
          </Card>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-border bg-card px-4 py-3 text-sm shadow-card">{toast}</div>
      ) : null}
      {!loading && bookingWindow?.mode === "next_week_only" && days.length > 0 && slots.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("portal.book.window.nextWeekEmpty")}</p>
      ) : null}
    </div>
  );
}
