"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/components/i18n/language-provider";
import { teacherFetch } from "@/lib/teacher/teacher-fetch";

export function TeacherServicesClient({ schoolSlug }) {
  const { t } = useLanguage();
  const [services, setServices] = useState([]);
  const [assignmentMode, setAssignmentMode] = useState("unassigned");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await teacherFetch(schoolSlug, "/api/teacher/services");
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof j.error === "string" ? j.error : t("teacher.services.loadError"));
      setServices([]);
    } else {
      setServices(Array.isArray(j.services) ? j.services : []);
      setAssignmentMode(j.assignmentMode || "unassigned");
    }
    setLoading(false);
  }, [schoolSlug, t]);

  useEffect(() => {
    load();
  }, [load]);

  const bannerKey =
    assignmentMode === "restricted"
      ? "teacher.services.bannerRestricted"
      : assignmentMode === "unassigned"
        ? "teacher.services.bannerUnassigned"
        : "teacher.services.bannerFallback";

  const emptyKey =
    assignmentMode === "restricted"
      ? "teacher.services.emptyRestricted"
      : assignmentMode === "unassigned"
        ? "teacher.services.emptyUnassigned"
        : "teacher.services.emptyNoSchoolServices";

  return (
    <div className="space-y-6 p-4 pb-10 md:p-6 md:pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("teacher.services.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("teacher.services.subtitle")}</p>
      </div>

      <p className="rounded-xl border border-border/60 bg-zinc-950/35 px-3 py-2.5 text-xs text-muted-foreground">{t(bannerKey)}</p>

      {error ? <div className="rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : services.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t(emptyKey)}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id} className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold leading-snug">{s.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p>
                  {t("teacher.services.duration")}: {s.duration_minutes} {t("teacher.services.min")}
                </p>
                {s.price != null ? (
                  <p>
                    {t("teacher.services.price")}: {s.price}
                  </p>
                ) : null}
                {s.description ? <p className="pt-1 text-[11px] leading-relaxed">{s.description}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
