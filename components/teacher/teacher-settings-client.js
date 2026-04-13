"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/i18n/language-provider";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { TEACHER_SETTINGS_DEFAULTS } from "@/lib/teacher/teacher-settings-defaults";
import {
  PolicySectionCard,
  PolicyTabButtons,
  TeacherPolicySettingsForm
} from "@/components/teacher/teacher-policy-settings-form";

export function TeacherSettingsClient({ schoolSlug }) {
  const { t } = useLanguage();
  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "" });
  const [policy, setPolicy] = useState(() => ({ ...TEACHER_SETTINGS_DEFAULTS }));
  const [policyTab, setPolicyTab] = useState("booking");
  const [loading, setLoading] = useState(true);
  const [policySaving, setPolicySaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [hasPersistedPolicyRow, setHasPersistedPolicyRow] = useState(false);
  const [canManageBookingPreferences, setCanManageBookingPreferences] = useState(true);
  const [canManageOwnSettings, setCanManageOwnSettings] = useState(true);
  const [isPolicyEditing, setIsPolicyEditing] = useState(false);
  const [error, setError] = useState("");
  const [policyMessage, setPolicyMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setPolicyMessage("");
    setIsPolicyEditing(false);
    const [pRes, sRes] = await Promise.all([
      teacherFetch(schoolSlug, "/api/teacher/profile"),
      teacherFetch(schoolSlug, "/api/teacher/settings")
    ]);
    const pJson = await pRes.json().catch(() => ({}));
    const sJson = await sRes.json().catch(() => ({}));
    if (!pRes.ok) {
      setError(pJson.error || t("teacher.settings.loadError"));
    } else {
      const p = pJson.profile || {};
      setProfile({
        full_name: p.full_name || "",
        email: p.email || "",
        phone: p.phone || ""
      });
    }
    if (sRes.ok && sJson.settings) {
      setPolicy({ ...TEACHER_SETTINGS_DEFAULTS, ...sJson.settings });
      setHasPersistedPolicyRow(Boolean(sJson.hasPersistedRow));
      setCanManageBookingPreferences(sJson.canManageBookingPreferences !== false);
      setCanManageOwnSettings(sJson.canManageOwnSettings !== false);
    } else if (!sRes.ok && sRes.status !== 404) {
      setError((e) => e || sJson.error || "Could not load booking policies.");
    }
    setLoading(false);
  }, [schoolSlug, t]);

  useEffect(() => {
    load();
  }, [load]);

  const savePolicy = async () => {
    setPolicySaving(true);
    setError("");
    setPolicyMessage("");
    const res = await teacherFetch(schoolSlug, "/api/teacher/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(policy)
    });
    const json = await res.json().catch(() => ({}));
    setPolicySaving(false);
    if (!res.ok) {
      setError(json.error || "Could not save policies.");
      return;
    }
    if (json.settings) setPolicy({ ...TEACHER_SETTINGS_DEFAULTS, ...json.settings });
    setHasPersistedPolicyRow(Boolean(json.hasPersistedRow));
    setPolicyMessage("Policies saved.");
    setIsPolicyEditing(false);
  };

  const resetPolicy = async () => {
    setPolicySaving(true);
    setError("");
    setPolicyMessage("");
    const res = await teacherFetch(schoolSlug, "/api/teacher/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true })
    });
    const json = await res.json().catch(() => ({}));
    setPolicySaving(false);
    if (!res.ok) {
      setError(json.error || "Could not reset policies.");
      return;
    }
    if (json.settings) setPolicy({ ...TEACHER_SETTINGS_DEFAULTS, ...json.settings });
    setHasPersistedPolicyRow(Boolean(json.hasPersistedRow));
    setPolicyMessage("Now using school defaults.");
    setIsPolicyEditing(false);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setError("");
    const res = await teacherFetch(schoolSlug, "/api/teacher/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: profile.full_name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim()
      })
    });
    setProfileSaving(false);
    if (res.ok) {
      await load();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || t("teacher.settings.loadError"));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("teacher.settings.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Account details, booking limits, and how students interact with your calendar.
        </p>
      </div>

      {error ? <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Account</CardTitle>
        </CardHeader>
        <CardContent className="max-w-lg space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <form className="space-y-4 text-sm" onSubmit={saveProfile}>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">{t("teacher.settings.name")}</span>
                <Input
                  value={profile.full_name}
                  onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                  className="rounded-xl"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">{t("teacher.settings.email")}</span>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                  className="rounded-xl"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">{t("teacher.settings.phone")}</span>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  className="rounded-xl"
                />
              </label>
              <Button type="submit" className="rounded-xl" disabled={profileSaving}>
                {profileSaving ? "…" : t("teacher.settings.save")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <PolicySectionCard
        title="Booking policies"
        description="These rules are enforced when students book with you. School-wide settings still apply where stricter."
      >
        <PolicyTabButtons active={policyTab} onChange={setPolicyTab} />
        {policyMessage ? (
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{policyMessage}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {hasPersistedPolicyRow ? "Mode: custom override for your account." : "Mode: inherited from school defaults."}
        </p>
        {!canManageBookingPreferences ? (
          <p className="text-xs text-muted-foreground">Your school has disabled editing booking preferences for your account.</p>
        ) : null}
        {!canManageOwnSettings ? (
          <p className="text-xs text-muted-foreground">Your school has disabled managing your own settings for your account.</p>
        ) : null}
        {canManageOwnSettings && canManageBookingPreferences && !isPolicyEditing ? (
          <div className="flex justify-end border-t border-border/50 pt-4">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setIsPolicyEditing(true)} disabled={loading}>
              Edit settings
            </Button>
          </div>
        ) : null}
        <TeacherPolicySettingsForm
          policy={policy}
          setPolicy={setPolicy}
          disabled={loading || policySaving || !canManageOwnSettings || !canManageBookingPreferences || !isPolicyEditing}
          tab={policyTab}
        />
        {canManageOwnSettings && canManageBookingPreferences && isPolicyEditing ? (
          <div className="flex flex-wrap gap-3 border-t border-border/50 pt-4">
            <Button
              type="button"
              className="rounded-xl"
              onClick={savePolicy}
              disabled={loading || policySaving || !canManageOwnSettings || !canManageBookingPreferences}
            >
              {policySaving ? "Saving…" : "Save policy changes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={resetPolicy}
              disabled={loading || policySaving || !canManageOwnSettings || !canManageBookingPreferences}
            >
              Use school defaults
            </Button>
          </div>
        ) : null}
      </PolicySectionCard>

      <p className="max-w-2xl text-sm text-muted-foreground">{t("teacher.settings.passwordHint")}</p>
      <p className="max-w-2xl text-sm text-muted-foreground">{t("teacher.settings.schoolRules")}</p>
    </div>
  );
}
