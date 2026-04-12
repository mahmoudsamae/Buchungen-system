"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/i18n/language-provider";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";
import { TeacherKpiCard } from "@/components/teacher/teacher-kpi-card";

function pct(v) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v}%`;
}

export function TeacherAnalyticsClient({ schoolSlug }) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await teacherFetch(schoolSlug, "/api/teacher/analytics");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || t("teacher.analytics.loadError"));
      setData(null);
    } else {
      setData(json);
    }
    setLoading(false);
  }, [schoolSlug, t]);

  useEffect(() => {
    load();
  }, [load]);

  const dayData = (data?.busiestDays || []).map((x) => ({ name: x.day, count: x.count }));
  const hourData = (data?.busiestHours || []).map((x) => ({ name: x.hour, count: x.count }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("teacher.analytics.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("teacher.analytics.subtitle")}</p>
      </div>

      {error ? <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      {loading || !data ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TeacherKpiCard label={t("teacher.analytics.lessonsWeek")} value={data.lessonsThisWeek} />
            <TeacherKpiCard label={t("teacher.analytics.lessonsMonth")} value={data.lessonsThisMonth} />
            <TeacherKpiCard label={t("teacher.analytics.activeStudents")} value={data.activeStudents} />
            <TeacherKpiCard label={t("teacher.analytics.newStudents")} value={data.newStudentsThisMonth} />
            <TeacherKpiCard label={t("teacher.analytics.cancellationRate")} value={pct(data.cancellationRatePct)} />
            <TeacherKpiCard label={t("teacher.analytics.completionRate")} value={pct(data.completionRatePct)} />
            <TeacherKpiCard label={t("teacher.analytics.avgPerStudent")} value={data.avgLessonsPerStudent ?? "—"} />
            <TeacherKpiCard label={t("teacher.analytics.inactive")} value={data.inactiveStudents} />
            <TeacherKpiCard label={t("teacher.analytics.hoursBooked")} value={data.bookedHoursWeek} />
            <TeacherKpiCard label={t("teacher.analytics.hoursAvailable")} value={data.availableHoursWeek} />
            <TeacherKpiCard label={t("teacher.analytics.utilization")} value={pct(data.utilizationPct)} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{t("teacher.analytics.busiestDays")}</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {dayData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px"
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base font-semibold">{t("teacher.analytics.busiestHours")}</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {hourData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">—</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px"
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(142 70% 45%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="max-w-2xl text-sm text-muted-foreground">
            Use busiest days and hours to shift your weekly availability or communicate peak times to your school. Low utilization with many
            available hours may mean openings need marketing or shorter windows.
          </p>
        </>
      )}
    </div>
  );
}
