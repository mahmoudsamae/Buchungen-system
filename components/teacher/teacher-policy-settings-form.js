"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const NOTICE_OPTIONS = [1, 2, 3, 6, 12, 18, 24, 36, 48, 72, 96, 120, 168];
const WINDOW_DAYS = [7, 14, 21, 28, 60, 90, 180, 365];
const DURATIONS = [45, 60, 90, 120];
const BREAKS = [0, 10, 15, 30];
const REMINDERS = [15, 30, 60];

function FieldLabel({ title, hint, htmlFor }) {
  return (
    <div className="space-y-0.5">
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none">
        {title}
      </label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ToggleRow({ id, title, hint, checked, onCheckedChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      <FieldLabel title={title} hint={hint} htmlFor={id} />
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function SelectRow({ id, title, hint, value, onChange, options, disabled, formatOption = (v) => String(v) }) {
  const n = Number(value);
  const safe = options.includes(n) ? n : options[0];
  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      <FieldLabel title={title} hint={hint} htmlFor={id} />
      <select
        id={id}
        disabled={disabled}
        value={safe}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-10 w-full max-w-xs rounded-lg border border-border bg-card px-3 text-sm"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {formatOption(o)}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * @param {{
 *   policy: Record<string, unknown>,
 *   setPolicy: (fn: (p: any) => any) => void,
 *   disabled?: boolean,
 *   tab: string
 * }} props
 */
export function TeacherPolicySettingsForm({ policy, setPolicy, disabled, tab }) {
  const p = policy;
  const set = (key, val) => setPolicy((prev) => ({ ...prev, [key]: val }));

  const limitsMuted = !p.allow_multiple_future_bookings;

  if (tab === "booking") {
    return (
      <div className="space-y-4">
        <ToggleRow
          id="instant_booking_enabled"
          title="Instant booking"
          hint="When on, eligible portal bookings confirm immediately. When off, students submit a request you approve."
          checked={p.instant_booking_enabled}
          onCheckedChange={(v) => set("instant_booking_enabled", v)}
          disabled={disabled}
        />
        <ToggleRow
          id="allow_multiple_future_bookings"
          title="Allow multiple upcoming bookings"
          hint="Turn off to cap students at one future lesson at a time (useful for strict pacing)."
          checked={p.allow_multiple_future_bookings}
          onCheckedChange={(v) => set("allow_multiple_future_bookings", v)}
          disabled={disabled}
        />
        <div className={cn("grid gap-4 sm:grid-cols-2", limitsMuted && "opacity-50 pointer-events-none")}>
          <SelectRow
            id="max_day"
            title="Max lessons per student per day"
            hint="Counted across active portal bookings for the same calendar day."
            value={p.max_bookings_per_student_per_day}
            onChange={(v) => set("max_bookings_per_student_per_day", v)}
            options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            disabled={disabled || limitsMuted}
          />
          <SelectRow
            id="max_week"
            title="Max lessons per student per week"
            hint="Monday–Sunday week in your school timezone."
            value={p.max_bookings_per_student_per_week}
            onChange={(v) => set("max_bookings_per_student_per_week", v)}
            options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20]}
            disabled={disabled || limitsMuted}
          />
        </div>
        <SelectRow
          id="min_notice"
          title="Minimum notice before a new booking"
          hint="Students cannot book a slot that starts sooner than this many hours from now."
          value={Number(p.minimum_hours_before_booking)}
          onChange={(v) => set("minimum_hours_before_booking", v)}
          options={NOTICE_OPTIONS}
          disabled={disabled}
          formatOption={(h) => `${h} hour(s)`}
        />
        <SelectRow
          id="booking_window_days"
          title="Booking window (days ahead)"
          hint="How far in advance students may book with you."
          value={p.booking_window_days}
          onChange={(v) => set("booking_window_days", v)}
          options={WINDOW_DAYS}
          disabled={disabled}
          formatOption={(d) => `${d} days`}
        />
      </div>
    );
  }

  if (tab === "availability") {
    return (
      <div className="space-y-4">
        <SelectRow
          id="default_lesson_duration_minutes"
          title="Default lesson length"
          hint="Used as the preferred duration for slot generation and scheduling hints."
          value={p.default_lesson_duration_minutes}
          onChange={(v) => set("default_lesson_duration_minutes", v)}
          options={DURATIONS}
          disabled={disabled}
          formatOption={(m) => `${m} minutes`}
        />
        <SelectRow
          id="break_between_lessons_minutes"
          title="Break between generated lessons"
          hint="Spacing between consecutive blocks when using the slot generator."
          value={p.break_between_lessons_minutes}
          onChange={(v) => set("break_between_lessons_minutes", v)}
          options={BREAKS}
          disabled={disabled}
          formatOption={(m) => (m === 0 ? "None" : `${m} minutes`)}
        />
        <ToggleRow
          id="weekly_recurring_availability_enabled"
          title="Weekly recurring availability"
          hint="When off, rely on date overrides and manual blocks instead of repeating weekly rules."
          checked={p.weekly_recurring_availability_enabled}
          onCheckedChange={(v) => set("weekly_recurring_availability_enabled", v)}
          disabled={disabled}
        />
        <ToggleRow
          id="auto_generate_slots_enabled"
          title="Auto-generate slots from rules"
          hint="Lets the smart generator propose bookable blocks from your weekly windows (availability page)."
          checked={p.auto_generate_slots_enabled}
          onCheckedChange={(v) => set("auto_generate_slots_enabled", v)}
          disabled={disabled}
        />
        <ToggleRow
          id="same_day_booking_enabled"
          title="Same-day booking"
          hint="Allow students to book lessons that occur later today."
          checked={p.same_day_booking_enabled}
          onCheckedChange={(v) => set("same_day_booking_enabled", v)}
          disabled={disabled}
        />
        {!p.weekly_recurring_availability_enabled ? (
          <p className="text-xs text-amber-600/90 dark:text-amber-400/90">
            Recurring rules are hidden in scheduling, but existing rules stay stored — adjust them anytime on the Availability page.
          </p>
        ) : null}
      </div>
    );
  }

  if (tab === "students") {
    return (
      <div className="space-y-4">
        <ToggleRow
          id="only_assigned_students_can_book"
          title="Only assigned students can book"
          hint="Requires a primary instructor assignment that matches you."
          checked={p.only_assigned_students_can_book}
          onCheckedChange={(v) => set("only_assigned_students_can_book", v)}
          disabled={disabled}
        />
        <ToggleRow
          id="only_active_students_can_book"
          title="Only active students can book"
          hint="Inactive or paused students are blocked at booking time."
          checked={p.only_active_students_can_book}
          onCheckedChange={(v) => set("only_active_students_can_book", v)}
          disabled={disabled}
        />
        <ToggleRow
          id="students_can_reschedule_their_own_bookings"
          title="Students can reschedule (portal)"
          hint="When your school allows customer rescheduling, this controls whether it applies to your students."
          checked={p.students_can_reschedule_their_own_bookings}
          onCheckedChange={(v) => set("students_can_reschedule_their_own_bookings", v)}
          disabled={disabled}
        />
        <ToggleRow
          id="students_can_cancel_their_own_bookings"
          title="Students can cancel online"
          hint="Applies on top of the school cancellation window."
          checked={p.students_can_cancel_their_own_bookings}
          onCheckedChange={(v) => set("students_can_cancel_their_own_bookings", v)}
          disabled={disabled}
        />
      </div>
    );
  }

  if (tab === "cancellation") {
    return (
      <div className="space-y-4">
        <SelectRow
          id="minimum_hours_before_cancellation"
          title="Minimum notice to cancel"
          hint="Students must cancel at least this many hours before the lesson starts (instructor policy)."
          value={Number(p.minimum_hours_before_cancellation)}
          onChange={(v) => set("minimum_hours_before_cancellation", v)}
          options={NOTICE_OPTIONS}
          disabled={disabled}
          formatOption={(h) => `${h} hour(s)`}
        />
        <SelectRow
          id="minimum_hours_before_reschedule"
          title="Minimum notice to reschedule"
          hint="Use this to require advance notice before a student moves a lesson (enforced when portal reschedule is available)."
          value={Number(p.minimum_hours_before_reschedule)}
          onChange={(v) => set("minimum_hours_before_reschedule", v)}
          options={NOTICE_OPTIONS}
          disabled={disabled}
          formatOption={(h) => `${h} hour(s)`}
        />
      </div>
    );
  }

  if (tab === "notifications") {
    return (
      <div className="space-y-4">
        <ToggleRow
          id="notify_on_new_booking"
          title="Notify on new booking"
          hint="In-app / email routing depends on school integrations; this stores your preference."
          checked={p.notify_on_new_booking}
          onCheckedChange={(v) => set("notify_on_new_booking", v)}
          disabled={disabled}
        />
        <ToggleRow
          id="notify_on_booking_cancellation"
          title="Notify on cancellation"
          checked={p.notify_on_booking_cancellation}
          onCheckedChange={(v) => set("notify_on_booking_cancellation", v)}
          disabled={disabled}
        />
        <SelectRow
          id="reminder_before_lesson_minutes"
          title="Lesson reminder lead time"
          hint="Preferred reminder window before the lesson (product notifications may roll out separately)."
          value={p.reminder_before_lesson_minutes}
          onChange={(v) => set("reminder_before_lesson_minutes", v)}
          options={REMINDERS}
          disabled={disabled}
          formatOption={(m) => `${m} minutes before`}
        />
      </div>
    );
  }

  return null;
}

export function PolicyTabButtons({ active, onChange }) {
  const tabs = [
    { id: "booking", label: "Booking rules" },
    { id: "availability", label: "Availability" },
    { id: "students", label: "Students" },
    { id: "cancellation", label: "Cancel & reschedule" },
    { id: "notifications", label: "Notifications" }
  ];
  return (
    <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition",
            active === t.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function PolicySectionCard({ title, description, children }) {
  return (
    <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
