"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarOff, Pencil, Sparkles, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ManagerDialog } from "@/components/manager/dialog";
import { useLanguage } from "@/components/i18n/language-provider";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { TeacherSmartSlotModal } from "@/components/teacher/teacher-smart-slot-modal";
import { cn } from "@/lib/utils";

const WEEKDAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TeacherAvailabilityClient({ schoolSlug }) {
  const { t } = useLanguage();
  const exceptionsRef = useRef(null);
  const [rules, setRules] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [migration, setMigration] = useState("");

  const [smartOpen, setSmartOpen] = useState(false);
  const [smartDay, setSmartDay] = useState(1);
  const [customOpen, setCustomOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);

  const [customWeekday, setCustomWeekday] = useState(1);
  const [customStart, setCustomStart] = useState("09:00");
  const [customEnd, setCustomEnd] = useState("12:00");
  const [customValidFrom, setCustomValidFrom] = useState("");
  const [customValidUntil, setCustomValidUntil] = useState("");

  const [ovDate, setOvDate] = useState("");
  const [ovClosed, setOvClosed] = useState(true);
  const [ovStart, setOvStart] = useState("10:00");
  const [ovEnd, setOvEnd] = useState("14:00");
  const [ovNote, setOvNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setMigration("");
    const from = new Date();
    const to = new Date();
    to.setMonth(to.getMonth() + 6);
    const qs = new URLSearchParams({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10)
    });
    const [rRes, oRes] = await Promise.all([
      teacherFetch(schoolSlug, "/api/teacher/availability/rules"),
      teacherFetch(schoolSlug, `/api/teacher/availability/overrides?${qs}`)
    ]);
    const rJson = await rRes.json().catch(() => ({}));
    const oJson = await oRes.json().catch(() => ({}));
    if (rRes.status === 503) {
      setMigration(rJson.error || t("teacher.availability.migrationHint"));
      setRules([]);
    } else if (!rRes.ok) {
      setError(rJson.error || t("teacher.availability.loadError"));
      setRules([]);
    } else {
      setRules(rJson.rules || []);
    }
    if (oRes.ok) {
      setOverrides(oJson.overrides || []);
    } else if (oRes.status === 503) {
      setOverrides([]);
    }
    setLoading(false);
  }, [schoolSlug, t]);

  useEffect(() => {
    const t0 = new Date();
    setOvDate(t0.toISOString().slice(0, 10));
    load();
  }, [load]);

  const rulesByDay = useMemo(() => {
    const m = {};
    for (let w = 0; w <= 6; w++) m[w] = [];
    for (const r of rules) {
      const w = Number(r.weekday);
      if (w >= 0 && w <= 6) m[w].push(r);
    }
    for (const w of Object.keys(m)) {
      m[w].sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    }
    return m;
  }, [rules]);

  const toggleRule = async (rule, next) => {
    const res = await teacherFetch(schoolSlug, `/api/teacher/availability/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next })
    });
    if (res.ok) await load();
  };

  const toggleWholeDay = async (w) => {
    const dayRules = rulesByDay[w] || [];
    if (!dayRules.length) return;
    const anyActive = dayRules.some((r) => r.is_active !== false);
    const next = !anyActive;
    for (const r of dayRules) {
      if ((r.is_active !== false) !== next) {
        const res = await teacherFetch(schoolSlug, `/api/teacher/availability/rules/${r.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: next })
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error || t("teacher.availability.loadError"));
          return;
        }
      }
    }
    await load();
  };

  const deleteRule = async (id) => {
    if (!confirm("Remove this window?")) return;
    const res = await teacherFetch(schoolSlug, `/api/teacher/availability/rules/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const addCustomRange = async () => {
    const res = await teacherFetch(schoolSlug, "/api/teacher/availability/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekday: customWeekday,
        start_time: customStart,
        end_time: customEnd,
        valid_from: customValidFrom || undefined,
        valid_until: customValidUntil || undefined
      })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || t("teacher.availability.loadError"));
      return;
    }
    setCustomOpen(false);
    await load();
  };

  const saveEditRule = async () => {
    if (!editRule) return;
    const vf =
      editRule.valid_from != null && String(editRule.valid_from).trim()
        ? String(editRule.valid_from).slice(0, 10)
        : null;
    const vu =
      editRule.valid_until != null && String(editRule.valid_until).trim()
        ? String(editRule.valid_until).slice(0, 10)
        : null;
    const res = await teacherFetch(schoolSlug, `/api/teacher/availability/rules/${editRule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_time: editRule.start_time,
        end_time: editRule.end_time,
        valid_from: vf,
        valid_until: vu
      })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || t("teacher.availability.loadError"));
      return;
    }
    setEditRule(null);
    await load();
  };

  const addOverride = async () => {
    const res = await teacherFetch(schoolSlug, "/api/teacher/availability/overrides", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        ovClosed
          ? { date: ovDate, is_closed: true, note: ovNote || undefined }
          : { date: ovDate, is_closed: false, start_time: ovStart, end_time: ovEnd, note: ovNote || undefined }
      )
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || t("teacher.availability.loadError"));
      return;
    }
    setOvNote("");
    await load();
  };

  const deleteOverride = async (id) => {
    if (!confirm("Remove this exception?")) return;
    const res = await teacherFetch(schoolSlug, `/api/teacher/availability/overrides/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const scrollToExceptions = () => {
    exceptionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const fmtValidity = (r) => {
    const vf = r.valid_from != null ? String(r.valid_from).slice(0, 10) : null;
    const vu = r.valid_until != null ? String(r.valid_until).slice(0, 10) : null;
    if (!vf && !vu) return null;
    if (vf && vu) return `${vf} → ${vu}`;
    if (vf) return `from ${vf}`;
    return `until ${vu}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("teacher.availability.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("teacher.availability.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            className="gap-2 rounded-xl"
            onClick={() => {
              setSmartDay(1);
              setSmartOpen(true);
            }}
          >
            <Sparkles className="h-4 w-4" />
            {t("teacher.availability.quickGenerate")}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCustomOpen(true)}>
            {t("teacher.availability.addCustomRange")}
          </Button>
          <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={scrollToExceptions}>
            <CalendarOff className="h-4 w-4" />
            {t("teacher.availability.blockDate")}
          </Button>
        </div>
      </div>

      {migration ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{migration}</div>
      ) : null}
      {error ? <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <TeacherSmartSlotModal
        open={smartOpen}
        onClose={() => setSmartOpen(false)}
        schoolSlug={schoolSlug}
        initialWeekday={smartDay}
        title={t("teacher.availability.smartGeneratorTitle")}
        onSaved={load}
      />

      <ManagerDialog open={customOpen} onClose={() => setCustomOpen(false)} title={t("teacher.availability.addCustomRange")}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-xs">
            {t("teacher.availability.weekday")}
            <Select value={String(customWeekday)} onChange={(e) => setCustomWeekday(Number(e.target.value))}>
              {WEEKDAY_LABEL.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
          </label>
          <div />
          <label className="space-y-1 text-xs">
            {t("teacher.availability.start")}
            <Input type="time" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-xl" />
          </label>
          <label className="space-y-1 text-xs">
            {t("teacher.availability.end")}
            <Input type="time" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-xl" />
          </label>
          <label className="space-y-1 text-xs">
            {t("teacher.availability.validFrom")}
            <Input type="date" value={customValidFrom} onChange={(e) => setCustomValidFrom(e.target.value)} className="rounded-xl" />
          </label>
          <label className="space-y-1 text-xs">
            {t("teacher.availability.validUntil")}
            <Input type="date" value={customValidUntil} onChange={(e) => setCustomValidUntil(e.target.value)} className="rounded-xl" />
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCustomOpen(false)}>
            Cancel
          </Button>
          <Button type="button" className="rounded-xl" onClick={addCustomRange}>
            {t("teacher.availability.saveWindow")}
          </Button>
        </div>
      </ManagerDialog>

      <ManagerDialog open={Boolean(editRule)} onClose={() => setEditRule(null)} title={t("teacher.availability.editWindow")}>
        {editRule ? (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-xs">
                {t("teacher.availability.start")}
                <Input
                  type="time"
                  value={String(editRule.start_time).slice(0, 5)}
                  onChange={(e) => setEditRule((r) => ({ ...r, start_time: e.target.value }))}
                  className="rounded-xl"
                />
              </label>
              <label className="space-y-1 text-xs">
                {t("teacher.availability.end")}
                <Input
                  type="time"
                  value={String(editRule.end_time).slice(0, 5)}
                  onChange={(e) => setEditRule((r) => ({ ...r, end_time: e.target.value }))}
                  className="rounded-xl"
                />
              </label>
              <label className="space-y-1 text-xs">
                {t("teacher.availability.validFrom")}
                <Input
                  type="date"
                  value={editRule.valid_from != null ? String(editRule.valid_from).slice(0, 10) : ""}
                  onChange={(e) => setEditRule((r) => ({ ...r, valid_from: e.target.value || null }))}
                  className="rounded-xl"
                />
              </label>
              <label className="space-y-1 text-xs">
                {t("teacher.availability.validUntil")}
                <Input
                  type="date"
                  value={editRule.valid_until != null ? String(editRule.valid_until).slice(0, 10) : ""}
                  onChange={(e) => setEditRule((r) => ({ ...r, valid_until: e.target.value || null }))}
                  className="rounded-xl"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditRule(null)}>
                Cancel
              </Button>
              <Button type="button" className="rounded-xl" onClick={saveEditRule}>
                {t("teacher.availability.saveWindow")}
              </Button>
            </div>
          </>
        ) : null}
      </ManagerDialog>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("teacher.availability.weekly")}</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {WEEKDAY_LABEL.map((label, w) => {
                const dayRules = rulesByDay[w] || [];
                const anyActive = dayRules.some((r) => r.is_active !== false);
                return (
                  <Card key={label} className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
                    <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
                      <CardTitle className="text-base font-semibold">{label}</CardTitle>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 rounded-lg text-xs"
                          onClick={() => {
                            setSmartDay(w);
                            setSmartOpen(true);
                          }}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {t("teacher.availability.dayGenerate")}
                        </Button>
                        {dayRules.length ? (
                          <button
                            type="button"
                            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                            onClick={() => toggleWholeDay(w)}
                            title={t("teacher.availability.toggleDay")}
                          >
                            {anyActive ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                          </button>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {!dayRules.length ? (
                        <p className="text-sm text-muted-foreground">{t("teacher.availability.dayOffHint")}</p>
                      ) : (
                        dayRules.map((r) => (
                          <div
                            key={r.id}
                            className={cn(
                              "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm",
                              r.is_active === false ? "border-border/30 opacity-60" : "border-border/50"
                            )}
                          >
                            <div>
                              <span className="font-mono text-xs">
                                {String(r.start_time).slice(0, 5)}–{String(r.end_time).slice(0, 5)}
                              </span>
                              {fmtValidity(r) ? (
                                <span className="ml-2 text-[11px] text-muted-foreground">({fmtValidity(r)})</span>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                                onClick={() => toggleRule(r, !r.is_active)}
                                title={t("teacher.availability.toggleDay")}
                              >
                                {r.is_active === false ? <ToggleLeft className="h-5 w-5" /> : <ToggleRight className="h-5 w-5 text-primary" />}
                              </button>
                              <button
                                type="button"
                                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                                onClick={() =>
                                  setEditRule({
                                    ...r,
                                    start_time: String(r.start_time).slice(0, 5),
                                    end_time: String(r.end_time).slice(0, 5)
                                  })
                                }
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="rounded-lg p-1 text-danger hover:bg-danger/10"
                                onClick={() => deleteRule(r.id)}
                                aria-label={t("teacher.availability.remove")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <section id="exceptions" ref={exceptionsRef}>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("teacher.availability.exceptions")}</h2>
            <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base">{t("teacher.availability.blocked")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <label className="space-y-1 text-xs">
                    {t("teacher.availability.date")}
                    <Input type="date" value={ovDate} onChange={(e) => setOvDate(e.target.value)} className="rounded-xl" />
                  </label>
                  <label className="flex items-center gap-2 pt-6 text-sm">
                    <input type="checkbox" checked={ovClosed} onChange={(e) => setOvClosed(e.target.checked)} />
                    {t("teacher.availability.dayOff")}
                  </label>
                  {!ovClosed ? (
                    <>
                      <label className="space-y-1 text-xs">
                        {t("teacher.availability.start")}
                        <Input type="time" value={ovStart} onChange={(e) => setOvStart(e.target.value)} className="rounded-xl" />
                      </label>
                      <label className="space-y-1 text-xs">
                        {t("teacher.availability.end")}
                        <Input type="time" value={ovEnd} onChange={(e) => setOvEnd(e.target.value)} className="rounded-xl" />
                      </label>
                    </>
                  ) : (
                    <>
                      <div />
                      <div />
                    </>
                  )}
                </div>
                <label className="block space-y-1 text-xs">
                  {t("teacher.availability.exceptionNote")}
                  <Input value={ovNote} onChange={(e) => setOvNote(e.target.value)} className="rounded-xl" placeholder="" />
                </label>
                <Button type="button" className="rounded-xl" onClick={addOverride}>
                  {t("teacher.availability.addOverride")}
                </Button>

                <ul className="space-y-2 text-sm">
                  {overrides.map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/40 bg-background/30 px-3 py-2"
                    >
                      <span className="font-mono">{o.override_date}</span>
                      <span className="text-muted-foreground">
                        {o.is_closed ? t("teacher.availability.dayOff") : `${String(o.start_time).slice(0, 5)}–${String(o.end_time).slice(0, 5)}`}
                      </span>
                      {o.note ? <span className="w-full text-xs text-muted-foreground md:w-auto">{o.note}</span> : null}
                      <button type="button" className="text-danger hover:underline" onClick={() => deleteOverride(o.id)}>
                        {t("teacher.availability.remove")}
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>

          <p className="text-xs text-muted-foreground">
            {t("teacher.availability.bookingHint")}
          </p>
        </>
      )}
    </div>
  );
}
