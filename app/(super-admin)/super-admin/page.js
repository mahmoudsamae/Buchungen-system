"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatsCard } from "@/components/shared/stats-card";
import { ChartPreview } from "@/components/manager/chart-preview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/super-admin/state");
      if (!res.ok) {
        setError("Unable to load platform state.");
        return;
      }
      setData(await res.json());
    })();
  }, []);

  if (error) {
    return <p className="p-6 text-sm text-danger">{error}</p>;
  }

  if (!data) {
    return <p className="p-6 text-sm text-muted-foreground">Loading platform overview…</p>;
  }

  const { totals, recentBusinesses, recentActivity } = data;
  const stats = [
    { label: "Total Businesses", value: String(totals.businesses), change: "All tenants" },
    { label: "Active", value: String(totals.active), change: "Operating" },
    { label: "Suspended", value: String(totals.suspended), change: "Restricted" },
    { label: "Total Managers", value: String(totals.managers), change: "One per business" },
    { label: "Platform Bookings", value: String(totals.bookings), change: "Across all" },
    { label: "Platform Users", value: String(totals.users), change: "All roles" }
  ];

  const bars = [
    { label: "Active", value: totals.active },
    { label: "Inactive", value: totals.inactive },
    { label: "Suspended", value: totals.suspended }
  ];

  return (
    <main className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold md:text-xl">Platform Dashboard</h1>
        <p className="text-xs text-muted-foreground">Aggregate view across all businesses</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <StatsCard key={s.label} label={s.label} value={s.value} change={s.change} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartPreview title="Business status mix" points={bars} />
        <Card>
          <CardHeader>
            <CardTitle>Recent businesses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentBusinesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No businesses yet.</p>
            ) : (
              recentBusinesses.map((b) => (
                <Link key={b.id} href={`/super-admin/businesses/${b.id}`} className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-muted/40">
                  <span className="font-medium">{b.name}</span>
                  <StatusBadge value={b.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Recent platform activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground">No activity logged.</p>
          ) : (
            recentActivity.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 last:border-0">
                <span>{a.message}</span>
                <span className="text-xs text-muted-foreground">{a.at}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
