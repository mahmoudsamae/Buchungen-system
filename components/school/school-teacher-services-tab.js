"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { managerFetch } from "@/lib/manager/manager-fetch";
import { useLanguage } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

export function SchoolTeacherServicesTab({ slug, userId, data, onSaved }) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const catalog = data?.servicesCatalog || [];
  const assigned = data?.assignedServiceIds || [];

  useEffect(() => {
    setSelected(new Set((assigned || []).map(String)));
  }, [assigned]);

  const activeCatalog = useMemo(() => catalog.filter((s) => s.is_active), [catalog]);
  const selectedCategoryNames = useMemo(() => {
    const ids = new Set([...selected].map(String));
    const names = new Set();
    for (const s of activeCatalog) {
      if (!ids.has(String(s.id))) continue;
      const n = String(s.category_name || "").trim();
      if (n) names.add(n);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [selected, activeCatalog]);

  const toggle = useCallback((id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      const s = String(id);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const res = await managerFetch(slug, `/api/manager/teachers/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceIds: [...selected] })
    });
    const j = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error(typeof j.error === "string" ? j.error : t("school.teacher.services.saveError"));
      return;
    }
    toast.success(t("school.teacher.services.saveSuccess"));
    onSaved?.(j.teacher);
  };

  if (!data?.membership || data.membership.role !== "staff") {
    return <p className="text-sm text-muted-foreground">{t("school.teacher.services.staffOnly")}</p>;
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">{t("school.teacher.services.title")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("school.teacher.services.subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t("school.teacher.services.hint")}</p>
          <Link
            href={`/manager/${slug}/services`}
            className="inline-flex text-xs font-semibold text-primary hover:underline"
          >
            {t("school.teacher.services.openSchoolServices")} →
          </Link>

          {activeCatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("school.teacher.services.noActiveCatalog")}</p>
          ) : (
            <>
              <div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2 text-xs">
                <p className="font-semibold text-foreground">Allowed categories for this teacher</p>
                <p className="mt-1 text-muted-foreground">
                  {selectedCategoryNames.length ? selectedCategoryNames.join(", ") : "No category assigned yet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeCatalog.map((s) => {
                  const on = selected.has(String(s.id));
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s.id)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-left text-xs font-medium transition",
                        on ? "border-primary/50 bg-primary/15 text-foreground" : "border-border/50 bg-muted/15 text-muted-foreground hover:bg-muted/30"
                      )}
                    >
                      <span className="block font-semibold">{s.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {s.category_name || "General"}{s.duration != null ? ` · ${s.duration} min` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex justify-end border-t border-border/40 pt-4">
            <Button type="button" className="rounded-xl" disabled={saving} onClick={save}>
              {saving ? t("common.loading") : t("school.teacher.services.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
