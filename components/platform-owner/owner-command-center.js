"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell
} from "recharts";
import { BusinessCreateModal } from "@/components/super-admin/business-create-modal";
import { cn } from "@/lib/utils";

function eur(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
}

function Kpi({ label, value, hint, className }) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-soft ring-1 ring-border/30 transition hover:border-border hover:shadow-card",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-3xl">{value}</p>
      {hint ? <p className="mt-2 text-xs leading-snug text-muted-foreground">{hint}</p> : null}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/10" />
    </div>
  );
}

const RANGE_OPTIONS = [
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
  { days: 90, label: "90d" }
];

export function OwnerCommandCenter() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [chartDays, setChartDays] = useState(30);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/super-admin/owner/dashboard?days=${chartDays}`);
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Could not load dashboard.");
      setLoading(false);
      return;
    }
    setData(await res.json());
    setForbidden(false);
    setLoading(false);
  }, [chartDays]);

  useEffect(() => {
    load();
  }, [load]);

  if (forbidden) {
    return (
      <div className="p-6 md:p-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-border/80 bg-card/60 p-8 text-center shadow-soft">
          <h1 className="text-lg font-semibold">Platform owner only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This command center is restricted to the platform owner account. Use the standard platform dashboard instead.
          </p>
          <Link href="/super-admin" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
            Go to platform dashboard
          </Link>
        </div>
      </div>
    );
  }

  const showFullSpinner = loading && !data;
  if (showFullSpinner) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading command center…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>
      </div>
    );
  }

  const { kpis, billing, charts, leaders, recentActivity } = data;

  const planBar = [
    { name: "Free", count: billing.byPlan?.free ?? 0, fill: "hsl(215 20% 45%)" },
    { name: "Basic", count: billing.byPlan?.basic ?? 0, fill: "hsl(217 91% 60%)" },
    { name: "Pro", count: billing.byPlan?.pro ?? 0, fill: "hsl(148 63% 42%)" }
  ];

  const statusBar = [
    { name: "Active", count: charts.tenantStatus.active, fill: "hsl(142 71% 45%)" },
    { name: "Inactive", count: charts.tenantStatus.inactive, fill: "hsl(220 9% 46%)" },
    { name: "Suspended", count: charts.tenantStatus.suspended, fill: "hsl(0 84% 60%)" }
  ];

  const chartTick = (v) => String(v).slice(5);

  return (
    <>
      {loading && data ? (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
          Updating…
        </div>
      ) : null}
      <div className="relative border-b border-border/60 bg-gradient-to-br from-card via-background to-background px-4 py-8 md:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-[1600px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/90">BookFlow</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Platform command center</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Real-time health of your tenant base, bookings, and billing. Built for scale — same patterns as Stripe & Linear
                internal tools.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Chart range</span>
              <div className="flex rounded-xl border border-border/80 bg-muted/30 p-0.5">
                {RANGE_OPTIONS.map((r) => (
                  <button
                    key={r.days}
                    type="button"
                    onClick={() => setChartDays(r.days)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                      chartDays === r.days ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Schools" value={String(kpis.totalSchools)} hint="All tenants on the platform" />
            <Kpi label="Teachers" value={String(kpis.teachers)} hint="Staff seats (business_users.role = staff)" />
            <Kpi label="Students" value={String(kpis.students)} hint="Customer role across schools" />
            <Kpi label="Bookings" value={String(kpis.totalBookings)} hint="Lifetime appointments" />
            <Kpi label="Total revenue" value={eur(kpis.totalRevenueEuros)} hint="Sum of platform_revenue_events" />
            <Kpi label="MRR" value={eur(kpis.mrrEuros)} hint="Active priced subscriptions (monthly)" />
            <Kpi label="Active subs" value={String(kpis.activeSubscriptions)} hint={billing.available ? "Including trial" : "Billing schema not migrated"} />
            <Kpi label="New schools (MTD)" value={String(kpis.newSchoolsThisMonth)} hint="Created this calendar month" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Paying schools" value={String(kpis.payingSchools)} hint="Subscriptions with price &gt; 0" />
            <Kpi label="Past due" value={String(kpis.pastDueSubscriptions)} hint="Needs dunning / Stripe recovery" />
            <Kpi label="Avg bookings / school" value={kpis.avgBookingsPerSchool} hint="Platform-wide mean" />
            <Kpi
              label="WoW growth"
              value={`${kpis.weeklyGrowthPct >= 0 ? "+" : ""}${kpis.weeklyGrowthPct}%`}
              hint="Bookings vs prior week"
            />
            <Kpi label="ARPU (est.)" value={eur(kpis.arpuEuros)} hint="Revenue ÷ students (proxy)" />
            <Kpi label="Conversion" value={kpis.conversionRatePct != null ? `${kpis.conversionRatePct}%` : "—"} hint="Needs visit tracking" />
            <Kpi label="Churn" value={kpis.churnRatePct != null ? `${kpis.churnRatePct}%` : "—"} hint="Wire Stripe churn webhooks" />
            <Kpi label="Billing API" value={billing.available ? "Live" : "Schema pending"} hint="Run migration 20260411120000" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 md:px-8">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-soft ring-1 ring-border/30">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Daily bookings</h2>
              <span className="text-[11px] text-muted-foreground">Last {charts.chartDays} days</span>
            </div>
            <div className="mt-4 h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.dailyBookings} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillBook" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={chartTick} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={32} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))"
                    }}
                    labelFormatter={(l) => String(l)}
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(217 91% 60%)" fill="url(#fillBook)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-soft ring-1 ring-border/30">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-tight">Revenue (cash events)</h2>
              <span className="text-[11px] text-muted-foreground">platform_revenue_events</span>
            </div>
            <div className="mt-4 h-[280px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.revenueByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(148 63% 42%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(148 63% 42%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={chartTick} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tickFormatter={(v) => `${(v / 100).toFixed(0)}€`}
                    tick={{ fontSize: 10 }}
                    stroke="hsl(var(--muted-foreground))"
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))"
                    }}
                    formatter={(value) => [eur(Number(value) / 100), ""]}
                    labelFormatter={(l) => String(l)}
                  />
                  <Area type="monotone" dataKey="amountCents" stroke="hsl(148 63% 42%)" fill="url(#fillRev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-soft ring-1 ring-border/30">
            <h2 className="text-sm font-semibold tracking-tight">School status mix</h2>
            <div className="mt-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBar} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.15)" }}
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {statusBar.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-soft ring-1 ring-border/30">
            <h2 className="text-sm font-semibold tracking-tight">Plans distribution</h2>
            <div className="mt-4 h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planBar} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {planBar.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-soft ring-1 ring-border/30 xl:col-span-1">
            <h2 className="text-sm font-semibold tracking-tight">Top schools · bookings</h2>
            <ul className="mt-4 space-y-2">
              {leaders.topSchoolsByBookings.length === 0 ? (
                <li className="text-sm text-muted-foreground">No data yet.</li>
              ) : (
                leaders.topSchoolsByBookings.map((s, i) => (
                  <li key={s.businessId} className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <Link href={`/super-admin/businesses/${s.businessId}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{s.count}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-soft ring-1 ring-border/30 xl:col-span-1">
            <h2 className="text-sm font-semibold tracking-tight">Top schools · revenue</h2>
            <ul className="mt-4 space-y-2">
              {leaders.topSchoolsByRevenue.length === 0 ? (
                <li className="text-sm text-muted-foreground">Record revenue events to populate this list.</li>
              ) : (
                leaders.topSchoolsByRevenue.map((s, i) => (
                  <li key={s.businessId} className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {i + 1}
                      </span>
                      <Link href={`/super-admin/businesses/${s.businessId}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{eur(s.cents / 100)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/50 p-5 shadow-soft ring-1 ring-border/30">
            <h2 className="text-sm font-semibold tracking-tight">Activity</h2>
            <ul className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {recentActivity.length === 0 ? (
                <li className="text-sm text-muted-foreground">No recent events.</li>
              ) : (
                recentActivity.map((a) => (
                  <li key={a.id} className="border-b border-border/40 py-2 text-sm last:border-0">
                    <p>{a.message}</p>
                    <p className="text-[11px] text-muted-foreground">{String(a.at).slice(0, 19).replace("T", " ")}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-muted/40 to-card/80 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Admin controls</h2>
            <p className="mt-1 text-xs text-muted-foreground">Provision tenants, manage platform staff, open school detail.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95"
            >
              Create school
            </button>
            <Link
              href="/super-admin/businesses"
              className="rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-muted/50"
            >
              All schools
            </Link>
            <Link
              href="/super-admin/owner/admins"
              className="rounded-xl border border-border/80 bg-card px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-muted/50"
            >
              Platform admins
            </Link>
            <button
              type="button"
              disabled
              title="Requires a dedicated impersonation session — integrate with Supabase admin + audit log."
              className="cursor-not-allowed rounded-xl border border-dashed border-border px-4 py-2.5 text-sm font-medium text-muted-foreground"
            >
              Impersonate (soon)
            </button>
          </div>
        </div>
      </div>

      <BusinessCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          load();
        }}
      />
    </>
  );
}
