"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useManager } from "@/components/manager/provider";
import { ManagerDialog } from "@/components/manager/dialog";
import { managerFetch } from "@/lib/manager/manager-fetch";
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

function localYmd(d) {
  const dt = d instanceof Date ? d : new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AvailabilityPage() {
  const { availability, categories, availabilityActions, business } = useManager();
  const { t } = useLanguage();
  const [tab, setTab] = useState("weekly");

  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [categoryId, setCategoryId] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genWeekday, setGenWeekday] = useState(1);
  const [genStart, setGenStart] = useState("09:00");
  const [genEnd, setGenEnd] = useState("17:00");
  const [genDuration, setGenDuration] = useState(() => String(business?.slot_duration_minutes || 30));
  const [genCategoryId, setGenCategoryId] = useState("");
  const [generateSubmitting, setGenerateSubmitting] = useState(false);

  const slotLen = business?.slot_duration_minutes || 30;

  // ---------------------------------------------------------------------------
  // Overrides (specific dates)
  // ---------------------------------------------------------------------------
  const [overrideDate, setOverrideDate] = useState(() => localYmd(new Date()));
  const [overrideStart, setOverrideStart] = useState("09:00");
  const [overrideEnd, setOverrideEnd] = useState("17:00");
  const [overrideClosed, setOverrideClosed] = useState(false);
  const [overrideCategoryId, setOverrideCategoryId] = useState("");
  const [overrideSaving, setOverrideSaving] = useState(false);

  const [rangeFrom, setRangeFrom] = useState(() => localYmd(new Date()));
  const [rangeTo, setRangeTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return localYmd(d);
  });
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [overrides, setOverrides] = useState([]);
  const [overridesToast, setOverridesToast] = useState("");

  const slug = business?.slug || "";

  const loadOverrides = async () => {
    if (!slug) return;
    setOverridesLoading(true);
    setOverridesToast("");
    try {
      const res = await managerFetch(
        slug,
        `/api/manager/availability/overrides?from=${encodeURIComponent(rangeFrom)}&to=${encodeURIComponent(rangeTo)}`
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOverridesToast(j.error || "Could not load date overrides.");
        setOverrides([]);
        return;
      }
      setOverrides(Array.isArray(j.overrides) ? j.overrides : []);
    } finally {
      setOverridesLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "dates") return;
    loadOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const overridesByDate = useMemo(() => {
    const map = new Map();
    for (const row of overrides) {
      const d = String(row.date || "").slice(0, 10);
      if (!d) continue;
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(row);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [overrides]);

  // ---------------------------------------------------------------------------
  // Preview
  // ---------------------------------------------------------------------------
  const [previewDate, setPreviewDate] = useState(() => localYmd(new Date()));
  const [previewCategoryId, setPreviewCategoryId] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const loadPreview = async () => {
    if (!slug) return;
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({ date: previewDate });
      if (previewCategoryId) params.set("categoryId", previewCategoryId);
      const res = await managerFetch(slug, `/api/manager/availability/preview?${params.toString()}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPreview({ error: j.error || "Could not preview availability." });
        return;
      }
      setPreview(j);
    } finally {
      setPreviewLoading(false);
    }
  };

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

        <div className="flex flex-wrap gap-2">
          {[
            { id: "weekly", label: "Weekly rules" },
            { id: "dates", label: "Specific dates & overrides" },
            { id: "preview", label: "Final preview" }
          ].map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={`h-10 rounded-xl border px-4 text-sm font-semibold transition ${
                tab === x.id
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/70 bg-card text-foreground hover:bg-muted/30"
              }`}
            >
              {x.label}
            </button>
          ))}
        </div>

        {tab === "weekly" ? (
          <>
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
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">All categories</option>
                {categories.filter((c) => c.is_active).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="button"
              onClick={() => availabilityActions.addRule(weekday, start, end, categoryId || null)}
              className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Add rule
            </button>
            <button
              type="button"
              onClick={() => {
                setGenDuration(String(business?.slot_duration_minutes || 30));
                setGenCategoryId("");
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
                            <Select
                              value={slot.raw?.category_id || ""}
                              onChange={(e) => availabilityActions.setCategory(slot.id, e.target.value || null)}
                            >
                              <option value="">All categories</option>
                              {categories.filter((c) => c.is_active).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </Select>
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
          </>
        ) : null}

        {tab === "dates" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Specific dates & overrides</CardTitle>
                <p className="text-sm text-muted-foreground">
                  If a date has any override windows, they <strong className="text-foreground">replace</strong> weekly rules
                  for that date. Marking a date closed hides all times for that date.
                </p>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Date</label>
                    <Input type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Category</label>
                    <Select value={overrideCategoryId} onChange={(e) => setOverrideCategoryId(e.target.value)}>
                      <option value="">All categories</option>
                      {categories.filter((c) => c.is_active).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Mode</label>
                    <Select value={overrideClosed ? "closed" : "open"} onChange={(e) => setOverrideClosed(e.target.value === "closed")}>
                      <option value="open">Open hours</option>
                      <option value="closed">Closed (whole day)</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Start</label>
                      <Input disabled={overrideClosed} value={overrideStart} onChange={(e) => setOverrideStart(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">End</label>
                      <Input disabled={overrideClosed} value={overrideEnd} onChange={(e) => setOverrideEnd(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
                  <button
                    type="button"
                    className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                    onClick={() => loadOverrides()}
                    disabled={overridesLoading}
                  >
                    {overridesLoading ? "Refreshing…" : "Refresh list"}
                  </button>
                  <button
                    type="button"
                    disabled={overrideSaving}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    onClick={async () => {
                      if (!slug) return;
                      setOverrideSaving(true);
                      setOverridesToast("");
                      try {
                        const scopeCategory = overrideCategoryId || null;
                        const scopeRows = (overrides || []).filter(
                          (r) =>
                            String(r.date || "").slice(0, 10) === overrideDate &&
                            (r.category_id || null) === scopeCategory &&
                            r.is_active !== false
                        );
                        const hasClosed = scopeRows.some((r) => Boolean(r.is_closed));
                        const hasOpenRows = scopeRows.some((r) => !r.is_closed);

                        if (!overrideClosed && hasClosed) {
                          setOverridesToast(
                            "This date is already marked as closed for this category scope. Remove/disable the closed entry first."
                          );
                          return;
                        }
                        if (overrideClosed && hasOpenRows) {
                          const proceed =
                            typeof window === "undefined"
                              ? true
                              : window.confirm(
                                  "This date already has open windows in the same category scope. Closing the whole day will disable those windows. Continue?"
                                );
                          if (!proceed) return;
                        }

                        const res = await managerFetch(slug, "/api/manager/availability/overrides", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            date: overrideDate,
                            is_closed: overrideClosed,
                            start_time: overrideClosed ? null : overrideStart,
                            end_time: overrideClosed ? null : overrideEnd,
                            categoryId: overrideCategoryId || null,
                            is_active: true
                          })
                        });
                        const j = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          setOverridesToast(j.error || "Could not save override.");
                          return;
                        }
                        await loadOverrides();
                        setOverridesToast("Saved.");
                        window.setTimeout(() => setOverridesToast(""), 1800);
                      } finally {
                        setOverrideSaving(false);
                      }
                    }}
                  >
                    {overrideSaving ? "Saving…" : overrideClosed ? "Add closed date" : "Add open hours"}
                  </button>
                </div>
                {overridesToast ? (
                  <p className="text-xs text-muted-foreground">{overridesToast}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Date overrides list</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Showing {rangeFrom} → {rangeTo}. Edit, disable, or delete entries.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">From</label>
                    <Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">To</label>
                    <Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="h-10 w-full rounded-md border px-4 text-sm font-semibold hover:bg-muted"
                      onClick={() => loadOverrides()}
                      disabled={overridesLoading}
                    >
                      {overridesLoading ? "Loading…" : "Apply range"}
                    </button>
                  </div>
                </div>

                {overridesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading date overrides…</p>
                ) : overridesByDate.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/80 bg-background/50 px-4 py-8 text-center text-sm text-muted-foreground">
                    No date overrides in this range.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {overridesByDate.map(([d, items]) => (
                      <section key={d} className="rounded-xl border border-border/80 bg-muted/15 p-4">
                        <div className="mb-3 flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-semibold">{d}</h3>
                          <span className="text-xs text-muted-foreground">
                            {items.length} entr{items.length === 1 ? "y" : "ies"}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {items.map((row) => {
                            const off = row.is_active === false;
                            const label = row.is_closed
                              ? "Closed (whole day)"
                              : `${String(row.start_time).slice(0, 5)}–${String(row.end_time).slice(0, 5)}`;
                            const cat = row.category_id
                              ? categories.find((c) => c.id === row.category_id)?.name || "Category"
                              : "All categories";
                            return (
                              <div
                                key={row.id}
                                className={`flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between ${
                                  off ? "opacity-70" : "border-primary/20"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">{label}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{cat}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    className="rounded-md border border-border/80 bg-background/80 px-3 py-2 text-xs font-medium hover:bg-muted"
                                    onClick={async () => {
                                      const res = await managerFetch(slug, `/api/manager/availability/overrides/${row.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ is_active: !row.is_active })
                                      });
                                      if (!res.ok) {
                                        const j = await res.json().catch(() => ({}));
                                        setOverridesToast(j.error || "Update failed.");
                                        return;
                                      }
                                      await loadOverrides();
                                    }}
                                  >
                                    {row.is_active ? "Disable" : "Enable"}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md border border-danger/35 bg-danger/5 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/10"
                                    onClick={async () => {
                                      if (typeof window !== "undefined" && !window.confirm("Delete this override?")) return;
                                      const res = await managerFetch(slug, `/api/manager/availability/overrides/${row.id}`, {
                                        method: "DELETE"
                                      });
                                      if (!res.ok) {
                                        const j = await res.json().catch(() => ({}));
                                        setOverridesToast(j.error || "Delete failed.");
                                        return;
                                      }
                                      await loadOverrides();
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}

        {tab === "preview" ? (
          <Card>
            <CardHeader>
              <CardTitle>Final availability preview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Uses the same precedence as the portal: closed dates win, then date windows, then weekly rules. Booked times are removed.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date</label>
                  <Input type="date" value={previewDate} onChange={(e) => setPreviewDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Category</label>
                  <Select value={previewCategoryId} onChange={(e) => setPreviewCategoryId(e.target.value)}>
                    <option value="">All categories</option>
                    {categories.filter((c) => c.is_active).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="h-10 w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    onClick={() => loadPreview()}
                    disabled={previewLoading}
                  >
                    {previewLoading ? "Loading…" : "Preview"}
                  </button>
                </div>
              </div>

              {preview?.error ? (
                <p className="text-sm text-danger">{preview.error}</p>
              ) : preview ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/70 bg-muted/10 p-4 text-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</p>
                    <p className="mt-1 font-medium text-foreground">{preview.source}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Windows: {Array.isArray(preview.windows) ? preview.windows.length : 0} · Slots:{" "}
                      {Array.isArray(preview.slots) ? preview.slots.length : 0}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(preview.slots || []).map((s) => (
                      <div key={s.start} className="rounded-xl border border-border/70 bg-card px-4 py-3">
                        <p className="font-mono text-sm font-semibold tabular-nums">
                          {s.start}–{s.end}
                        </p>
                      </div>
                    ))}
                    {(preview.slots || []).length === 0 ? (
                      <p className="sm:col-span-2 lg:col-span-3 rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                        No bookable slots for this date.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Pick a date and run Preview.</p>
              )}
            </CardContent>
          </Card>
        ) : null}
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
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={genCategoryId} onChange={(e) => setGenCategoryId(e.target.value)}>
                <option value="">All categories</option>
                {categories.filter((c) => c.is_active).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
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
                    slot_duration_minutes: d,
                    categoryId: genCategoryId || null
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
