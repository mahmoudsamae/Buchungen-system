"use client";

import { useEffect, useMemo, useState } from "react";
import { useManager } from "@/components/manager/provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { validateBusinessSettingsPayload } from "@/lib/manager/business-settings";
import { COMMON_TIMEZONES } from "@/lib/manager/common-timezones";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function ToggleField({ label, hint, checked, onChange, disabled }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/5 p-4 sm:flex-row sm:items-center sm:justify-between"
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} className="shrink-0" />
    </div>
  );
}

function Section({ title, description, children, className }) {
  return (
    <Card className={cn("overflow-hidden border-border/60 shadow-card", className)}>
      <CardHeader className="border-b border-border/50 bg-muted/[0.12] px-4 py-4 sm:px-5">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">{children}</CardContent>
    </Card>
  );
}

export function BusinessSettingsForm() {
  const { settings, settingsActions } = useManager();
  const { t } = useLanguage();
  const [form, setForm] = useState(settings);
  const [clientError, setClientError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
    setClientError("");
  }, [settings]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(settings), [form, settings]);

  const tzOptions = useMemo(() => {
    const s = new Set([...COMMON_TIMEZONES, form.timezone || "UTC"].filter(Boolean));
    return [...s].sort();
  }, [form.timezone]);

  const update = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setClientError("");
  };

  const onSave = async () => {
    setClientError("");
    const { errors } = validateBusinessSettingsPayload(form);
    if (errors.length) {
      setClientError(errors[0]);
      return;
    }
    setSaving(true);
    await settingsActions.save(form);
    setSaving(false);
  };

  const onDiscard = () => {
    setForm(settings);
    setClientError("");
  };

  return (
    <>
      <div className="mx-auto grid max-w-4xl gap-5 px-4 pb-28 pt-2 md:px-6">
        <Section
          title={t("manager.settings.section.profile")}
          description={t("manager.settings.section.profileHint")}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">{t("manager.settings.field.businessName")}</p>
              <Input
                value={form.businessName}
                onChange={(e) => update({ businessName: e.target.value })}
                disabled={saving}
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("manager.settings.field.email")}</p>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
                disabled={saving}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("manager.settings.field.phone")}</p>
              <Input
                value={form.phone}
                onChange={(e) => update({ phone: e.target.value })}
                disabled={saving}
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">{t("manager.settings.field.timezone")}</p>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm outline-none ring-primary focus:ring-2"
                value={form.timezone}
                onChange={(e) => update({ timezone: e.target.value })}
                disabled={saving}
              >
                {tzOptions.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        <Section
          title={t("manager.settings.section.bookingBasics")}
          description={t("manager.settings.section.bookingBasicsHint")}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => update({ autoConfirm: true })}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                form.autoConfirm ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30" : "border-border/50 hover:bg-muted/20"
              )}
            >
              <p className="text-sm font-semibold">{t("manager.settings.approval.instant")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("manager.settings.approval.instantHint")}</p>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => update({ autoConfirm: false })}
              className={cn(
                "rounded-xl border p-4 text-left transition",
                !form.autoConfirm ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30" : "border-border/50 hover:bg-muted/20"
              )}
            >
              <p className="text-sm font-semibold">{t("manager.settings.approval.manual")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("manager.settings.approval.manualHint")}</p>
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("manager.settings.field.slotDuration")}</p>
              <Input
                type="number"
                min={5}
                max={480}
                value={form.slot_duration_minutes}
                onChange={(e) => update({ slot_duration_minutes: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("manager.settings.field.bookingPolicy")}</p>
            <Textarea
              value={form.bookingPolicy}
              onChange={(e) => update({ bookingPolicy: e.target.value })}
              disabled={saving}
              placeholder={t("manager.settings.field.bookingPolicyPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("manager.settings.field.cancellationPolicy")}</p>
            <Textarea
              value={form.cancellationPolicy}
              onChange={(e) => update({ cancellationPolicy: e.target.value })}
              disabled={saving}
              placeholder={t("manager.settings.field.cancellationPolicyPlaceholder")}
            />
          </div>
        </Section>

        <Section
          title={t("manager.settings.section.bookingRules")}
          description={t("manager.settings.section.bookingRulesHint")}
        >
          <ToggleField
            label={t("manager.settings.rule.preventOverlap")}
            hint={t("manager.settings.rule.preventOverlapHint")}
            checked={form.preventOverlappingBookingsEnabled}
            onChange={(v) => update({ preventOverlappingBookingsEnabled: v })}
            disabled={saving}
          />

          <ToggleField
            label={t("manager.settings.rule.dayLimit")}
            hint={t("manager.settings.rule.dayLimitHint")}
            checked={form.maxBookingsPerDayEnabled}
            onChange={(v) => update({ maxBookingsPerDayEnabled: v })}
            disabled={saving}
          />
          {form.maxBookingsPerDayEnabled ? (
            <div className="space-y-2 pl-1">
              <p className="text-xs text-muted-foreground">{t("manager.settings.rule.maxPerDay")}</p>
              <Input
                type="number"
                min={1}
                max={50}
                className="max-w-[200px]"
                value={form.maxBookingsPerDay}
                onChange={(e) => update({ maxBookingsPerDay: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          ) : null}

          <ToggleField
            label={t("manager.settings.rule.weekLimit")}
            hint={t("manager.settings.rule.weekLimitHint")}
            checked={form.maxBookingsPerWeekEnabled}
            onChange={(v) => update({ maxBookingsPerWeekEnabled: v })}
            disabled={saving}
          />
          {form.maxBookingsPerWeekEnabled ? (
            <div className="space-y-2 pl-1">
              <p className="text-xs text-muted-foreground">{t("manager.settings.rule.maxPerWeek")}</p>
              <Input
                type="number"
                min={1}
                max={500}
                className="max-w-[200px]"
                value={form.maxBookingsPerWeek}
                onChange={(e) => update({ maxBookingsPerWeek: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          ) : null}

          <ToggleField
            label={t("manager.settings.rule.monthLimit")}
            hint={t("manager.settings.rule.monthLimitHint")}
            checked={form.maxBookingsPerMonthEnabled}
            onChange={(v) => update({ maxBookingsPerMonthEnabled: v })}
            disabled={saving}
          />
          {form.maxBookingsPerMonthEnabled ? (
            <div className="space-y-2 pl-1">
              <p className="text-xs text-muted-foreground">{t("manager.settings.rule.maxPerMonth")}</p>
              <Input
                type="number"
                min={1}
                max={2000}
                className="max-w-[200px]"
                value={form.maxBookingsPerMonth}
                onChange={(e) => update({ maxBookingsPerMonth: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          ) : null}

          <ToggleField
            label={t("manager.settings.rule.minNotice")}
            hint={t("manager.settings.rule.minNoticeHint")}
            checked={form.minNoticeHoursEnabled}
            onChange={(v) => update({ minNoticeHoursEnabled: v })}
            disabled={saving}
          />
          {form.minNoticeHoursEnabled ? (
            <div className="space-y-2 pl-1">
              <p className="text-xs text-muted-foreground">{t("manager.settings.rule.hours")}</p>
              <Input
                type="number"
                min={0}
                max={8760}
                className="max-w-[200px]"
                value={form.minNoticeHours}
                onChange={(e) => update({ minNoticeHours: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          ) : null}

          <ToggleField
            label={t("manager.settings.rule.maxAdvance")}
            hint={t("manager.settings.rule.maxAdvanceHint")}
            checked={form.maxFutureBookingDaysEnabled}
            onChange={(v) => update({ maxFutureBookingDaysEnabled: v })}
            disabled={saving}
          />
          {form.maxFutureBookingDaysEnabled ? (
            <div className="space-y-2 pl-1">
              <p className="text-xs text-muted-foreground">{t("manager.settings.rule.days")}</p>
              <Input
                type="number"
                min={1}
                max={730}
                className="max-w-[200px]"
                value={form.maxFutureBookingDays}
                onChange={(e) => update({ maxFutureBookingDays: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          ) : null}

          <ToggleField
            label={t("manager.settings.rule.buffer")}
            hint={t("manager.settings.rule.bufferHint")}
            checked={form.bufferBetweenBookingsEnabled}
            onChange={(v) => update({ bufferBetweenBookingsEnabled: v })}
            disabled={saving}
          />
          {form.bufferBetweenBookingsEnabled ? (
            <div className="space-y-2 pl-1">
              <p className="text-xs text-muted-foreground">{t("manager.settings.rule.bufferMinutes")}</p>
              <Input
                type="number"
                min={0}
                max={480}
                className="max-w-[200px]"
                value={form.bufferBetweenBookingsMinutes}
                onChange={(e) => update({ bufferBetweenBookingsMinutes: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          ) : null}

          <ToggleField
            label={t("manager.settings.rule.sameDayBookings")}
            hint={t("manager.settings.rule.sameDayBookingsHint")}
            checked={form.allowSameDayBookings}
            onChange={(v) => update({ allowSameDayBookings: v })}
            disabled={saving}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("manager.settings.rule.bookingWindowMode")}</p>
            <select
              className="h-10 w-full max-w-[320px] rounded-md border border-input bg-card px-3 text-sm outline-none ring-primary focus:ring-2"
              value={form.portalBookingWindowMode}
              onChange={(e) => update({ portalBookingWindowMode: e.target.value })}
              disabled={saving}
            >
              <option value="rolling">{t("manager.settings.rule.bookingWindowMode.rolling")}</option>
              <option value="next_week_only">{t("manager.settings.rule.bookingWindowMode.nextWeekOnly")}</option>
            </select>
            <p className="text-xs text-muted-foreground">{t("manager.settings.rule.bookingWindowModeHint")}</p>
          </div>

          <ToggleField
            label={t("manager.settings.rule.releaseWindow")}
            hint={t("manager.settings.rule.releaseWindowHint")}
            checked={form.bookingReleaseWindowEnabled}
            onChange={(v) => update({ bookingReleaseWindowEnabled: v })}
            disabled={saving}
          />
          {form.bookingReleaseWindowEnabled ? (
            <div className="grid gap-3 pl-1 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("manager.settings.rule.allowedFrom")}</p>
                <Input
                  type="time"
                  className="max-w-[200px]"
                  value={form.bookingAllowedFrom}
                  onChange={(e) => update({ bookingAllowedFrom: e.target.value })}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("manager.settings.rule.allowedUntil")}</p>
                <Input
                  type="time"
                  className="max-w-[200px]"
                  value={form.bookingAllowedUntil}
                  onChange={(e) => update({ bookingAllowedUntil: e.target.value })}
                  disabled={saving}
                />
              </div>
            </div>
          ) : null}
        </Section>

        <Section
          title={t("manager.settings.section.cancellation")}
          description={t("manager.settings.section.cancellationHint")}
        >
          <ToggleField
            label={t("manager.settings.cancel.allowCustomer")}
            hint={t("manager.settings.cancel.allowCustomerHint")}
            checked={form.allowCustomerCancellations}
            onChange={(v) => update({ allowCustomerCancellations: v })}
            disabled={saving}
          />
          <ToggleField
            label={t("manager.settings.cancel.deadline")}
            hint={t("manager.settings.cancel.deadlineHint")}
            checked={form.cancellationDeadlineHoursEnabled}
            onChange={(v) => update({ cancellationDeadlineHoursEnabled: v })}
            disabled={saving}
          />
          {form.cancellationDeadlineHoursEnabled ? (
            <div className="space-y-2 pl-1">
              <p className="text-xs text-muted-foreground">{t("manager.settings.cancel.hoursBefore")}</p>
              <Input
                type="number"
                min={0}
                max={8760}
                className="max-w-[200px]"
                value={form.cancellationDeadlineHours}
                onChange={(e) => update({ cancellationDeadlineHours: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">{t("manager.settings.cancel.lateText")}</p>
            <Textarea
              value={form.lateCancellationNoticeText}
              onChange={(e) => update({ lateCancellationNoticeText: e.target.value })}
              disabled={saving}
              placeholder={t("manager.settings.cancel.latePlaceholder")}
            />
          </div>
          <ToggleField
            label={t("manager.settings.cancel.autoNoShow")}
            hint={t("manager.settings.cancel.autoNoShowHint")}
            checked={form.autoMarkNoShowEnabled}
            onChange={(v) => update({ autoMarkNoShowEnabled: v })}
            disabled={saving}
          />
        </Section>

        <Section
          title={t("manager.settings.section.restrictions")}
          description={t("manager.settings.section.restrictionsHint")}
        >
          <ToggleField
            label={t("manager.settings.restrict.requireAccount")}
            hint={t("manager.settings.restrict.requireAccountHint")}
            checked={form.requireAccountToBook}
            onChange={(v) => update({ requireAccountToBook: v })}
            disabled={saving}
          />
          <ToggleField
            label={t("manager.settings.restrict.requireEmailVerified")}
            hint={t("manager.settings.restrict.requireEmailVerifiedHint")}
            checked={form.requireEmailVerificationToBook}
            onChange={(v) => update({ requireEmailVerificationToBook: v })}
            disabled={saving}
          />
          <ToggleField
            label={t("manager.settings.restrict.blockNoShows")}
            hint={t("manager.settings.restrict.blockNoShowsHint")}
            checked={form.blockAfterNoShowsEnabled}
            onChange={(v) => update({ blockAfterNoShowsEnabled: v })}
            disabled={saving}
          />
          {form.blockAfterNoShowsEnabled ? (
            <div className="space-y-2 pl-1">
              <p className="text-xs text-muted-foreground">{t("manager.settings.restrict.thresholdNoShows")}</p>
              <Input
                type="number"
                min={1}
                max={100}
                className="max-w-[200px]"
                value={form.blockAfterNoShowsCount}
                onChange={(e) => update({ blockAfterNoShowsCount: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          ) : null}
          <ToggleField
            label={t("manager.settings.restrict.blockCancellations")}
            hint={t("manager.settings.restrict.blockCancellationsHint")}
            checked={form.blockAfterCancellationsEnabled}
            onChange={(v) => update({ blockAfterCancellationsEnabled: v })}
            disabled={saving}
          />
          {form.blockAfterCancellationsEnabled ? (
            <div className="space-y-2 pl-1">
              <p className="text-xs text-muted-foreground">{t("manager.settings.restrict.thresholdCancellations")}</p>
              <Input
                type="number"
                min={1}
                max={500}
                className="max-w-[200px]"
                value={form.blockAfterCancellationsCount}
                onChange={(e) => update({ blockAfterCancellationsCount: Number(e.target.value) })}
                disabled={saving}
              />
            </div>
          ) : null}
        </Section>

        <Section
          title={t("manager.settings.section.experience")}
          description={t("manager.settings.section.experienceHint")}
        >
          <ToggleField
            label={t("manager.settings.exp.showRemaining")}
            hint={t("manager.settings.exp.showRemainingHint")}
            checked={form.showRemainingSlotsToCustomers}
            onChange={(v) => update({ showRemainingSlotsToCustomers: v })}
            disabled={saving}
          />
          <ToggleField
            label={t("manager.settings.exp.showBookingPolicy")}
            hint={t("manager.settings.exp.showBookingPolicyHint")}
            checked={form.showBookingPolicyAtCheckout}
            onChange={(v) => update({ showBookingPolicyAtCheckout: v })}
            disabled={saving}
          />
          <ToggleField
            label={t("manager.settings.exp.showCancelPolicy")}
            hint={t("manager.settings.exp.showCancelPolicyHint")}
            checked={form.showCancellationPolicyAtCheckout}
            onChange={(v) => update({ showCancellationPolicyAtCheckout: v })}
            disabled={saving}
          />
          <ToggleField
            label={t("manager.settings.exp.allowReschedule")}
            hint={t("manager.settings.exp.allowRescheduleHint")}
            checked={form.allowCustomerReschedule}
            onChange={(v) => update({ allowCustomerReschedule: v })}
            disabled={saving}
          />
          <ToggleField
            label={t("manager.settings.exp.allowTeacherRestoreCancelled")}
            hint={t("manager.settings.exp.allowTeacherRestoreCancelledHint")}
            checked={form.allowTeachersToRestoreCancelledBookings}
            onChange={(v) => update({ allowTeachersToRestoreCancelledBookings: v })}
            disabled={saving}
          />
        </Section>

        {clientError ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {clientError}
          </p>
        ) : null}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-[10040] border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {dirty ? t("manager.settings.sticky.unsaved") : t("manager.settings.sticky.saved")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!dirty || saving} onClick={onDiscard}>
              {t("manager.settings.sticky.discard")}
            </Button>
            <Button type="button" size="sm" disabled={!dirty || saving} onClick={onSave}>
              {saving ? t("manager.settings.sticky.saving") : t("manager.settings.sticky.save")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
