"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { managerFetch } from "@/lib/manager/manager-fetch";
import { TEACHER_PERMISSION_KEYS, TEACHER_ROLE_PRESETS } from "@/lib/manager/teacher-permissions";
import { cn } from "@/lib/utils";

const P_RESET = ["standard", "restricted", "senior"];

function labelForPermissionKey(k) {
  if (k === "can_restore_cancelled_booking") return "Restore cancelled bookings";
  if (k === "can_manage_own_settings") return "Manage own settings";
  return k
    .replace(/^can_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SchoolTeacherManagementPanel({ slug, userId, data, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [rolePreset, setRolePreset] = useState("standard");
  const [overrides, setOverrides] = useState({});
  const [bookingPolicy, setBookingPolicy] = useState({});

  const ts = data?.teacherSettings;
  useEffect(() => {
    setTitle(data?.staffExtension?.title || "");
    setRolePreset(data?.rolePreset || "standard");
    setOverrides(data?.staffExtension?.permission_overrides && typeof data.staffExtension.permission_overrides === "object" ? data.staffExtension.permission_overrides : {});
    if (ts && typeof ts === "object") {
      setBookingPolicy({
        instant_booking_enabled: ts.instant_booking_enabled,
        booking_window_days: ts.booking_window_days,
        minimum_hours_before_booking: ts.minimum_hours_before_booking,
        max_bookings_per_student_per_day: ts.max_bookings_per_student_per_day,
        max_bookings_per_student_per_week: ts.max_bookings_per_student_per_week,
        allow_multiple_future_bookings: ts.allow_multiple_future_bookings
      });
    }
  }, [data, ts]);

  const effectivePerm = useCallback(
    (key) => {
      const presetBase = TEACHER_ROLE_PRESETS[rolePreset] || TEACHER_ROLE_PRESETS.standard;
      let v = presetBase[key];
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        v = Boolean(overrides[key]);
      }
      return v !== false;
    },
    [rolePreset, overrides]
  );

  const togglePermissionKey = (key) => {
    setOverrides((prev) => {
      const presetBase = TEACHER_ROLE_PRESETS[rolePreset] || TEACHER_ROLE_PRESETS.standard;
      const current = Object.prototype.hasOwnProperty.call(prev, key) ? Boolean(prev[key]) : presetBase[key];
      return { ...prev, [key]: !current };
    });
  };

  const saveAll = async () => {
    setSaving(true);
    const res = await managerFetch(slug, `/api/manager/teachers/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || null,
        rolePreset,
        permissionOverrides: overrides,
        bookingPolicy
      })
    });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error(typeof j.error === "string" ? j.error : "Save failed.");
      return;
    }
    toast.success("Teacher settings saved.");
    onSaved?.(j.teacher);
  };

  if (!data?.membership || data.membership.role !== "staff") {
    return <p className="text-sm text-muted-foreground">Management tools apply to staff teachers only.</p>;
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
        <CardHeader>
          <CardTitle className="text-base">Role & permissions</CardTitle>
          <p className="text-xs text-muted-foreground">
            Choose a preset, then optionally override individual capabilities. Unlisted flags follow the preset.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Title / specialization (optional)</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" placeholder="e.g. Senior instructor" />
          </label>
          <label className="block space-y-1 text-xs">
            <span className="text-muted-foreground">Role preset</span>
            <Select value={rolePreset} onChange={(e) => setRolePreset(e.target.value)} className="rounded-xl">
              {P_RESET.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </label>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Advanced overrides</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TEACHER_PERMISSION_KEYS.map((key) => {
                const on = effectivePerm(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePermissionKey(key)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition",
                      on ? "border-primary/40 bg-primary/10" : "border-border/50 bg-muted/15"
                    )}
                  >
                    <span>{labelForPermissionKey(key)}</span>
                    <span className="tabular-nums text-muted-foreground">{on ? "On" : "Off"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
        <CardHeader>
          <CardTitle className="text-base">Booking policy</CardTitle>
          <p className="text-xs text-muted-foreground">Maps to this teacher&apos;s portal and scheduling rules.</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Booking mode</span>
            <Select
              value={bookingPolicy.instant_booking_enabled ? "direct" : "approval"}
              onChange={(e) =>
                setBookingPolicy((p) => ({ ...p, instant_booking_enabled: e.target.value === "direct" }))
              }
            >
              <option value="direct">Direct (instant confirm)</option>
              <option value="approval">Approval required</option>
            </Select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Booking window (days)</span>
            <Input
              type="number"
              min={1}
              max={365}
              value={bookingPolicy.booking_window_days ?? ""}
              onChange={(e) => setBookingPolicy((p) => ({ ...p, booking_window_days: Number(e.target.value) }))}
              className="rounded-xl"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Minimum notice (hours)</span>
            <Input
              type="number"
              min={0}
              max={168}
              step={0.5}
              value={bookingPolicy.minimum_hours_before_booking ?? ""}
              onChange={(e) => setBookingPolicy((p) => ({ ...p, minimum_hours_before_booking: Number(e.target.value) }))}
              className="rounded-xl"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Max lessons / student / day</span>
            <Input
              type="number"
              min={1}
              max={50}
              value={bookingPolicy.max_bookings_per_student_per_day ?? ""}
              onChange={(e) => setBookingPolicy((p) => ({ ...p, max_bookings_per_student_per_day: Number(e.target.value) }))}
              className="rounded-xl"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">Max lessons / student / week</span>
            <Input
              type="number"
              min={1}
              max={100}
              value={bookingPolicy.max_bookings_per_student_per_week ?? ""}
              onChange={(e) => setBookingPolicy((p) => ({ ...p, max_bookings_per_student_per_week: Number(e.target.value) }))}
              className="rounded-xl"
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="rounded border-border"
              checked={bookingPolicy.allow_multiple_future_bookings !== false}
              onChange={(e) => setBookingPolicy((p) => ({ ...p, allow_multiple_future_bookings: e.target.checked }))}
            />
            <span className="text-muted-foreground">Allow multiple upcoming bookings</span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" className="rounded-xl" disabled={saving} onClick={saveAll}>
          {saving ? "Saving…" : "Save management settings"}
        </Button>
      </div>
    </div>
  );
}
