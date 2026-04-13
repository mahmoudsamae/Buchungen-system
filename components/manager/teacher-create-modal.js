"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ManagerDialog } from "@/components/manager/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";
import { managerFetch } from "@/lib/manager/manager-fetch";
import { TEACHER_SETTINGS_DEFAULTS } from "@/lib/teacher/teacher-settings-defaults";

const ROLE_PRESETS = ["standard", "restricted", "senior"];

function initialForm() {
  return {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    status: "active",
    title: "",
    rolePreset: "standard",
    configureBookingPolicy: false,
    bookingPolicy: {
      instant_booking_enabled: TEACHER_SETTINGS_DEFAULTS.instant_booking_enabled,
      booking_window_days: TEACHER_SETTINGS_DEFAULTS.booking_window_days,
      minimum_hours_before_booking: TEACHER_SETTINGS_DEFAULTS.minimum_hours_before_booking,
      max_bookings_per_student_per_day: TEACHER_SETTINGS_DEFAULTS.max_bookings_per_student_per_day,
      max_bookings_per_student_per_week: TEACHER_SETTINGS_DEFAULTS.max_bookings_per_student_per_week,
      allow_multiple_future_bookings: TEACHER_SETTINGS_DEFAULTS.allow_multiple_future_bookings
    }
  };
}

/**
 * School: create staff teacher — compact modal (assign services from teacher profile or Services page).
 */
export function TeacherCreateModal({ open, onClose, slug, onCreated }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initialForm());
  }, [open]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!slug) return;
    setSaving(true);
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      status: form.status,
      rolePreset: form.rolePreset
    };
    const title = form.title.trim();
    if (title) payload.title = title;
    if (form.configureBookingPolicy) payload.bookingPolicy = { ...form.bookingPolicy };

    const res = await managerFetch(slug, "/api/manager/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error(body.error || t("manager.teachers.addError"));
      return;
    }
    toast.success(t("manager.teachers.addSuccess"));
    onCreated?.(body.user);
    onClose();
  }

  return (
    <ManagerDialog open={open} onClose={onClose} wide title={t("manager.teachers.createModalTitle")}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("manager.teachers.field.fullName")}</span>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              required
              autoComplete="name"
              className="rounded-xl"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("manager.teachers.field.email")}</span>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              autoComplete="email"
              className="rounded-xl"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("manager.teachers.field.phone")}</span>
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              autoComplete="tel"
              className="rounded-xl"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("manager.teachers.field.password")}</span>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              minLength={8}
              required
              autoComplete="new-password"
              className="rounded-xl"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("manager.teachers.field.status")}</span>
            <Select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-xl"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="suspended">suspended</option>
            </Select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="text-muted-foreground">{t("manager.teachers.field.titleOptional")}</span>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={t("manager.teachers.field.titlePlaceholder")}
              className="rounded-xl"
            />
          </label>
        </div>

        <label className="block space-y-1 text-xs">
          <span className="text-muted-foreground">{t("manager.teachers.field.rolePreset")}</span>
          <Select
            value={form.rolePreset}
            onChange={(e) => setForm((f) => ({ ...f, rolePreset: e.target.value }))}
            className="w-full max-w-md rounded-xl"
          >
            {ROLE_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <span className="block text-[11px] text-muted-foreground">{t("manager.teachers.field.rolePresetHint")}</span>
        </label>

        <details className="rounded-xl border border-border/50 bg-muted/10 p-3">
          <summary className="cursor-pointer text-xs font-medium text-foreground">{t("manager.teachers.createOptionalBooking")}</summary>
          <div className="mt-3 space-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={form.configureBookingPolicy}
                onChange={(e) => setForm((f) => ({ ...f, configureBookingPolicy: e.target.checked }))}
              />
              {t("manager.teachers.field.configureBookingPolicy")}
            </label>
            {form.configureBookingPolicy ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs">
                  <span className="text-muted-foreground">{t("manager.teachers.field.bookingMode")}</span>
                  <Select
                    value={form.bookingPolicy.instant_booking_enabled ? "direct" : "approval"}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bookingPolicy: {
                          ...f.bookingPolicy,
                          instant_booking_enabled: e.target.value === "direct"
                        }
                      }))
                    }
                    className="w-full rounded-xl"
                  >
                    <option value="direct">{t("manager.teachers.field.bookingModeDirect")}</option>
                    <option value="approval">{t("manager.teachers.field.bookingModeApproval")}</option>
                  </Select>
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-muted-foreground">{t("manager.teachers.field.bookingWindowDays")}</span>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={form.bookingPolicy.booking_window_days ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bookingPolicy: { ...f.bookingPolicy, booking_window_days: Number(e.target.value) }
                      }))
                    }
                    className="rounded-xl"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-muted-foreground">{t("manager.teachers.field.minimumNoticeHours")}</span>
                  <Input
                    type="number"
                    min={0}
                    max={168}
                    step={0.5}
                    value={form.bookingPolicy.minimum_hours_before_booking ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bookingPolicy: { ...f.bookingPolicy, minimum_hours_before_booking: Number(e.target.value) }
                      }))
                    }
                    className="rounded-xl"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-muted-foreground">{t("manager.teachers.field.maxPerDay")}</span>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.bookingPolicy.max_bookings_per_student_per_day ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bookingPolicy: { ...f.bookingPolicy, max_bookings_per_student_per_day: Number(e.target.value) }
                      }))
                    }
                    className="rounded-xl"
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span className="text-muted-foreground">{t("manager.teachers.field.maxPerWeek")}</span>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={form.bookingPolicy.max_bookings_per_student_per_week ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bookingPolicy: { ...f.bookingPolicy, max_bookings_per_student_per_week: Number(e.target.value) }
                      }))
                    }
                    className="rounded-xl"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs sm:col-span-2">
                  <input
                    type="checkbox"
                    className="rounded border-border"
                    checked={form.bookingPolicy.allow_multiple_future_bookings !== false}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bookingPolicy: { ...f.bookingPolicy, allow_multiple_future_bookings: e.target.checked }
                      }))
                    }
                  />
                  <span className="text-muted-foreground">{t("manager.teachers.field.allowMultipleUpcoming")}</span>
                </label>
              </div>
            ) : null}
          </div>
        </details>

        <p className="text-[11px] text-muted-foreground">{t("manager.teachers.createAssignServicesHint")}</p>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" className="rounded-xl" disabled={saving}>
            {saving ? t("common.loading") : t("manager.teachers.submit")}
          </Button>
        </div>
      </form>
    </ManagerDialog>
  );
}
