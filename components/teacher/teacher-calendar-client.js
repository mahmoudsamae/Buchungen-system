"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

export function TeacherCalendarClient({ schoolSlug }) {
  const { t } = useLanguage();
  const [view, setView] = useState("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const range = useMemo(() => {
    if (view === "day") {
      const ymd = format(cursor, "yyyy-MM-dd");
      return { from: ymd, to: ymd };
    }
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
    }
    const sm = startOfMonth(cursor);
    const em = endOfMonth(cursor);
    return { from: format(sm, "yyyy-MM-dd"), to: format(em, "yyyy-MM-dd") };
  }, [cursor, view]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = new URLSearchParams({ from: range.from, to: range.to });
    const res = await teacherFetch(schoolSlug, `/api/teacher/bookings?${qs}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || t("teacher.calendar.loadError"));
      setBookings([]);
    } else {
      setBookings(json.bookings || []);
    }
    setLoading(false);
  }, [schoolSlug, range.from, range.to, t]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => {
    const m = {};
    for (const b of bookings) {
      const d = b.date;
      if (!m[d]) m[d] = [];
      m[d].push(b);
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => a.time.localeCompare(b.time));
    }
    return m;
  }, [bookings]);

  const conflicts = useMemo(() => {
    const out = new Set();
    for (const d of Object.keys(byDate)) {
      const list = byDate[d];
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (list[i].time === list[j].time) {
            out.add(`${d}|${list[i].time}`);
          }
        }
      }
    }
    return out;
  }, [byDate]);

  const monthGrid = useMemo(() => {
    const sm = startOfMonth(cursor);
    const em = endOfMonth(cursor);
    const start = startOfWeek(sm, { weekStartsOn: 1 });
    const end = endOfWeek(em, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: endOfWeek(cursor, { weekStartsOn: 1 }) });
  }, [cursor]);

  /** Selected calendar day as YYYY-MM-DD — single source of truth with `cursor` for day/week/month views */
  const dayYmd = useMemo(() => format(cursor, "yyyy-MM-dd"), [cursor]);
  const dayBookings = byDate[dayYmd] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("teacher.calendar.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("teacher.calendar.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border/50 p-0.5">
            {(["day", "week", "month"] ).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                )}
              >
                {v === "day" ? t("teacher.calendar.view.day") : v === "week" ? t("teacher.calendar.view.week") : t("teacher.calendar.view.month")}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() =>
              setCursor((c) => (view === "week" ? addWeeks(c, -1) : view === "day" ? addDays(c, -1) : addMonths(c, -1)))
            }
          >
            ‹
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() =>
              setCursor((c) => (view === "week" ? addWeeks(c, 1) : view === "day" ? addDays(c, 1) : addMonths(c, 1)))
            }
          >
            ›
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : view === "day" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl lg:col-span-1">
            <CardContent className="pt-6">
              <InputDayPicker
                value={dayYmd}
                onChange={(ymd) => {
                  const [y, m, d] = ymd.split("-").map(Number);
                  setCursor(new Date(y, m - 1, d, 12, 0, 0));
                }}
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl lg:col-span-2">
            <CardContent className="space-y-2 pt-6">
              {dayBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("teacher.calendar.empty")}</p>
              ) : (
                dayBookings.map((b) => (
                  <div
                    key={b.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm",
                      conflicts.has(`${b.date}|${b.time}`) ? "border-amber-500/50 bg-amber-500/5" : "border-border/40"
                    )}
                  >
                    <span className="font-mono text-muted-foreground">
                      {b.time}–{b.endTime}
                    </span>
                    <span className="font-medium">{b.customer}</span>
                    <StatusBadge value={b.status} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : view === "week" ? (
        <div className="grid gap-3 md:grid-cols-7">
          {weekDays.map((d) => {
            const ymd = format(d, "yyyy-MM-dd");
            const list = byDate[ymd] || [];
            return (
              <Card key={ymd} className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
                <div className="border-b border-border/40 px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                  {format(d, "EEE d")}
                </div>
                <CardContent className="space-y-1.5 pt-3 text-xs">
                  {list.length === 0 ? <p className="text-muted-foreground">—</p> : null}
                  {list.map((b) => (
                    <div
                      key={b.id}
                      className={cn(
                        "rounded-lg border px-2 py-1.5",
                        conflicts.has(`${b.date}|${b.time}`) ? "border-amber-500/40" : "border-border/30"
                      )}
                    >
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {b.time} {conflicts.has(`${b.date}|${b.time}`) ? "⚠" : ""}
                      </div>
                      <div className="truncate font-medium">{b.customer}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-muted-foreground">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((x) => (
              <div key={x} className="py-1">
                {x}
              </div>
            ))}
          </div>
          <div className="grid min-w-[720px] grid-cols-7 gap-1">
            {monthGrid.map((d) => {
              const ymd = format(d, "yyyy-MM-dd");
              const list = byDate[ymd] || [];
              const inMonth = isSameMonth(d, cursor);
              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={() => {
                    setCursor(d);
                    setView("day");
                  }}
                  className={cn(
                    "min-h-[88px] rounded-xl border p-1.5 text-left text-xs transition hover:border-primary/30",
                    inMonth ? "border-border/40 bg-card/50" : "border-transparent bg-transparent opacity-40"
                  )}
                >
                  <div className="mb-1 font-medium">{format(d, "d")}</div>
                  <div className="space-y-0.5">
                    {list.slice(0, 3).map((b) => (
                      <div key={b.id} className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px]">
                        {b.time} {b.customer}
                      </div>
                    ))}
                    {list.length > 3 ? <div className="text-[10px] text-muted-foreground">+{list.length - 3}</div> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function InputDayPicker({ value, onChange }) {
  return (
    <label className="block space-y-2 text-sm">
      <span className="text-xs text-muted-foreground">Date</span>
      <input
        type="date"
        className="h-10 w-full rounded-xl border bg-card px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
