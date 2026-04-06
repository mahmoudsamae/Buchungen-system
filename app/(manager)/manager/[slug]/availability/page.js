"use client";

import { useState } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useManager } from "@/components/manager/provider";
import { ManagerDialog } from "@/components/manager/dialog";
import { Clock, Sparkles } from "lucide-react";

const DAYS = [
  { v: 0, label: "Sunday" },
  { v: 1, label: "Monday" },
  { v: 2, label: "Tuesday" },
  { v: 3, label: "Wednesday" },
  { v: 4, label: "Thursday" },
  { v: 5, label: "Friday" },
  { v: 6, label: "Saturday" }
];

export default function AvailabilityPage() {
  const { availability, availabilityActions, business } = useManager();
  const { t } = useLanguage();
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genWeekday, setGenWeekday] = useState(1);
  const [genStart, setGenStart] = useState("09:00");
  const [genEnd, setGenEnd] = useState("17:00");
  const [genDuration, setGenDuration] = useState(() => String(business?.slot_duration_minutes || 30));
  const [generateSubmitting, setGenerateSubmitting] = useState(false);

  const slotLen = business?.slot_duration_minutes || 30;

  return (
    <>
      <PageHeader
        businessName={business?.name}
        subtitle={t("manager.pages.availability.subtitle")}
      />
      <main className="grid gap-4 p-4 pb-10 md:p-6 md:pb-12">
        <p className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          {t("manager.pages.availability.slotHint", { min: String(slotLen) })}
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Add a single window</CardTitle>
            <p className="text-sm text-muted-foreground">
              One continuous open period (e.g. 08:00–12:00). Customers see bookable slots inside each window based on your slot length.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Weekday</label>
              <Select value={String(weekday)} onChange={(e) => setWeekday(Number(e.target.value))}>
                {DAYS.map((d) => (
                  <option key={d.v} value={d.v}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Start</label>
              <Input className="w-28" value={start} onChange={(e) => setStart(e.target.value)} placeholder="09:00" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">End</label>
              <Input className="w-28" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="17:00" />
            </div>
            <button
              type="button"
              onClick={() => availabilityActions.addRule(weekday, start, end)}
              className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Add rule
            </button>
            <button
              type="button"
              onClick={() => {
                setGenDuration(String(business?.slot_duration_minutes || 30));
                setGenerateOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 text-sm font-semibold text-primary hover:bg-primary/15"
            >
              <Sparkles className="h-4 w-4" />
              Generate slots
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current rules</CardTitle>
            <p className="text-sm text-muted-foreground">
              Each block is one bookable window. Edit the time range, or use Disable / Remove.
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            {availability.map((day) => (
              <section
                key={day.day}
                className="rounded-xl border border-border/90 bg-muted/20 p-4 shadow-sm ring-1 ring-border/40 dark:bg-muted/10 dark:ring-border/30"
              >
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Weekday</p>
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{day.day}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {day.slots.length === 0 ? "No windows" : `${day.slots.length} window${day.slots.length === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {day.slots.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border/80 bg-background/50 px-4 py-6 text-center text-sm text-muted-foreground">
                      No availability windows for this day.
                    </p>
                  ) : (
                    day.slots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${
                          slot.enabled
                            ? "border-primary/25 ring-1 ring-primary/10"
                            : "border-border/70 opacity-75 ring-1 ring-border/30"
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                          <div
                            className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg sm:mt-0 ${
                              slot.enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                            }`}
                            aria-hidden
                          >
                            <Clock className="h-5 w-5" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                Time range
                              </span>
                              {!slot.enabled ? (
                                <span className="rounded-full border border-border/80 bg-muted/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Off
                                </span>
                              ) : null}
                            </div>
                            <Input
                              className="h-auto min-h-[2.75rem] w-full min-w-0 border-border/80 bg-background/80 px-3 py-2.5 font-mono text-lg font-semibold tabular-nums tracking-tight text-foreground shadow-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 sm:max-w-md"
                              value={slot.time}
                              onChange={(e) => availabilityActions.updateSlot(day.day, slot.id, e.target.value)}
                              aria-label={`Window ${slot.time}`}
                            />
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border/50 pt-3 sm:border-t-0 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => availabilityActions.toggleSlot(day.day, slot.id)}
                            className="rounded-md border border-border/80 bg-background/80 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                          >
                            {slot.enabled ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => availabilityActions.removeSlot(day.day, slot.id)}
                            className="rounded-md border border-danger/35 bg-danger/5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            ))}
          </CardContent>
        </Card>
      </main>

      <ManagerDialog open={generateOpen} onClose={() => setGenerateOpen(false)} title="Generate slots" wide>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Creates <strong className="text-foreground">one availability window per slot</strong> for the chosen day — for example 09:00–10:30, 10:30–12:00, … until the day end. Any partial slot at the end is skipped.
          </p>
          <p className="text-muted-foreground">
            Your business <strong className="text-foreground">default slot length</strong> is updated to match so the customer booking page shows the same ranges you configure here.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Weekday</label>
              <Select value={String(genWeekday)} onChange={(e) => setGenWeekday(Number(e.target.value))}>
                {DAYS.map((d) => (
                  <option key={d.v} value={d.v}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Slot length (minutes)</label>
              <Input
                type="number"
                min={5}
                max={480}
                step={5}
                value={genDuration}
                onChange={(e) => setGenDuration(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Day opens</label>
              <Input value={genStart} onChange={(e) => setGenStart(e.target.value)} placeholder="09:00" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Day closes</label>
              <Input value={genEnd} onChange={(e) => setGenEnd(e.target.value)} placeholder="17:00" />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
            <button type="button" className="rounded-md border px-4 py-2 text-sm hover:bg-muted" onClick={() => setGenerateOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              disabled={generateSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              onClick={async () => {
                const d = Number(genDuration);
                if (!Number.isFinite(d) || d < 5) return;
                setGenerateSubmitting(true);
                try {
                  const result = await availabilityActions.generateSlots({
                    weekday: genWeekday,
                    start_time: genStart,
                    end_time: genEnd,
                    slot_duration_minutes: d
                  });
                  if (result?.ok) setGenerateOpen(false);
                } finally {
                  setGenerateSubmitting(false);
                }
              }}
            >
              {generateSubmitting ? "Saving…" : "Generate"}
            </button>
          </div>
        </div>
      </ManagerDialog>
    </>
  );
}
