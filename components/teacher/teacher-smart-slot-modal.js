"use client";

import { useEffect, useMemo, useState } from "react";
import { ManagerDialog } from "@/components/manager/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { generateLessonSlotsWithBuffer } from "@/lib/teacher/slot-generator";
import { cn } from "@/lib/utils";

const WEEKDAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TeacherSmartSlotModal({ open, onClose, schoolSlug, initialWeekday = 1, title, onSaved }) {
  const [weekday, setWeekday] = useState(initialWeekday);
  const [dayStart, setDayStart] = useState("09:00");
  const [dayEnd, setDayEnd] = useState("15:00");
  const [duration, setDuration] = useState(90);
  const [buffer, setBuffer] = useState(0);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [replaceWeekday, setReplaceWeekday] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setWeekday(initialWeekday);
      setError("");
    }
  }, [open, initialWeekday]);

  const preview = useMemo(() => {
    if (!dayStart || !dayEnd || !duration) return [];
    if (String(dayStart).slice(0, 5) >= String(dayEnd).slice(0, 5)) return [];
    return generateLessonSlotsWithBuffer(dayStart, dayEnd, duration, buffer);
  }, [dayStart, dayEnd, duration, buffer]);

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await teacherFetch(schoolSlug, "/api/teacher/availability/rules/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate",
          weekday,
          day_start: dayStart,
          day_end: dayEnd,
          slot_duration_minutes: duration,
          buffer_minutes: buffer,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          repeat_weekly: true,
          replace_weekday: replaceWeekday
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not save.");
        return;
      }
      onSaved?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <ManagerDialog open={open} onClose={onClose} title={title || "Smart slot generator"} wide>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-xs">
          Weekday
          <Select value={String(weekday)} onChange={(e) => setWeekday(Number(e.target.value))}>
            {WEEKDAY_LABEL.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" checked={replaceWeekday} onChange={(e) => setReplaceWeekday(e.target.checked)} />
          Replace existing windows for this weekday
        </label>
        <label className="space-y-1 text-xs">
          Range start
          <Input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} className="rounded-xl" />
        </label>
        <label className="space-y-1 text-xs">
          Range end
          <Input type="time" value={dayEnd} onChange={(e) => setDayEnd(e.target.value)} className="rounded-xl" />
        </label>
        <label className="space-y-1 text-xs">
          Slot duration (minutes)
          <Input
            type="number"
            min={5}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="rounded-xl"
          />
        </label>
        <label className="space-y-1 text-xs">
          Buffer between slots (minutes)
          <Input
            type="number"
            min={0}
            step={5}
            value={buffer}
            onChange={(e) => setBuffer(Number(e.target.value))}
            className="rounded-xl"
          />
        </label>
        <label className="space-y-1 text-xs">
          Valid from (optional)
          <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className="rounded-xl" />
        </label>
        <label className="space-y-1 text-xs">
          Valid until (optional)
          <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="rounded-xl" />
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-6 rounded-xl border border-border/50 bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
        {preview.length ? (
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto font-mono text-sm">
            {preview.map((s) => (
              <li key={`${s.start}-${s.end}`}>
                {s.start}–{s.end}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Adjust times and duration to see contiguous slots.</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className="rounded-xl" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" className={cn("rounded-xl", !preview.length && "opacity-60")} disabled={busy || !preview.length} onClick={save}>
          {busy ? "Saving…" : "Save weekly rules"}
        </Button>
      </div>
    </ManagerDialog>
  );
}
