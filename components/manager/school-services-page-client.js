"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useManager } from "@/components/manager/provider";
import { ConfirmDialog, ManagerDialog } from "@/components/manager/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { managerFetch } from "@/lib/manager/manager-fetch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CategoryCombobox } from "@/components/manager/category-combobox";
import { buildDefaultNewServiceForm } from "@/lib/manager/default-new-service-form";

export function SchoolServicesPageClient() {
  const { business, services, categories, serviceActions, loadAll } = useManager();
  const { t } = useLanguage();
  const businessSlug = business?.slug ?? "";

  const [serviceEditing, setServiceEditing] = useState(null);
  const [serviceDeleting, setServiceDeleting] = useState(null);

  const [staffUsers, setStaffUsers] = useState([]);
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignSelected, setAssignSelected] = useState(() => new Set());
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [serviceSubmitAttempted, setServiceSubmitAttempted] = useState(false);

  const categoryName = useMemo(() => {
    const m = new Map((categories || []).map((c) => [c.id, c.name]));
    return (id) => (id ? m.get(id) || "—" : "—");
  }, [categories]);

  const sortedServices = useMemo(
    () => [...(services || [])].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [services]
  );

  const categoriesForServiceModal = useMemo(() => {
    const list = categories || [];
    const editingId = serviceEditing?.categoryId;
    return list.filter(
      (c) => (c.is_active !== false && c.status !== "inactive") || (editingId && c.id === editingId)
    );
  }, [categories, serviceEditing?.categoryId]);

  const serviceFormValid = useMemo(() => {
    if (!serviceEditing) return false;
    const nameOk = String(serviceEditing.name || "").trim().length > 0;
    const d = Number(serviceEditing.duration);
    const durationOk = Number.isInteger(d) && d >= 5 && d <= 480;
    const categoryOk = Boolean(String(serviceEditing.categoryId || "").trim());
    const hasCategories = (categories || []).length > 0;
    return nameOk && durationOk && categoryOk && hasCategories;
  }, [serviceEditing, categories]);

  const loadTeam = useCallback(async () => {
    if (!businessSlug) return;
    const res = await managerFetch(businessSlug, "/api/manager/team");
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const staff = (j.users || []).filter((u) => u.role === "staff");
    setStaffUsers(staff);
  }, [businessSlug]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const loadAssignmentForTeacher = useCallback(
    async (teacherId) => {
      if (!businessSlug || !teacherId) {
        setAssignSelected(new Set());
        return;
      }
      setAssignLoading(true);
      setAssignError("");
      const res = await managerFetch(
        businessSlug,
        `/api/manager/teacher-services?teacherId=${encodeURIComponent(teacherId)}`
      );
      const j = await res.json().catch(() => ({}));
      setAssignLoading(false);
      if (!res.ok) {
        setAssignError(typeof j.error === "string" ? j.error : "Could not load assignments.");
        setAssignSelected(new Set());
        return;
      }
      setAssignSelected(new Set((j.serviceIds || []).map(String)));
    },
    [businessSlug]
  );

  useEffect(() => {
    if (assignTeacherId) loadAssignmentForTeacher(assignTeacherId);
    else setAssignSelected(new Set());
  }, [assignTeacherId, loadAssignmentForTeacher]);

  const toggleServiceInAssignment = (serviceId) => {
    setAssignSelected((prev) => {
      const next = new Set(prev);
      const id = String(serviceId);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveAssignments = async () => {
    if (!businessSlug || !assignTeacherId) return;
    setAssignSaving(true);
    setAssignError("");
    const res = await managerFetch(businessSlug, "/api/manager/teacher-services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: assignTeacherId,
        serviceIds: [...assignSelected]
      })
    });
    const j = await res.json().catch(() => ({}));
    setAssignSaving(false);
    if (!res.ok) {
      setAssignError(typeof j.error === "string" ? j.error : "Save failed.");
      return;
    }
    await loadAll();
  };

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.services.subtitle")} />
      <main className="space-y-6 p-4 pb-10 md:p-6 md:pb-12">
        <p className="text-sm text-muted-foreground">
          {t("manager.pages.services.categoriesHint")}{" "}
          <Link href={`/manager/${businessSlug}/categories`} className="font-medium text-primary underline-offset-4 hover:underline">
            {t("manager.pages.services.categoriesLink")}
          </Link>
        </p>

        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("manager.pages.services.catalogTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("manager.pages.services.emptyCatalog")}</p>
            ) : (
              sortedServices.map((service) => (
                <div
                  key={service.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-zinc-950/25 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoryName(service.categoryId)} · {service.duration} min
                      {service.price != null ? ` · ${service.price}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge value={service.status} />
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60">
                        {t("common.actions")}
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onSelect={() => {
                            setServiceSubmitAttempted(false);
                            setServiceEditing(service);
                          }}
                        >
                          {t("manager.pages.services.menuEdit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => serviceActions.toggleStatus(service.id)}>
                          {service.status === "active" ? t("manager.pages.services.disable") : t("manager.pages.services.enable")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => setServiceDeleting(service)}>
                          {t("manager.pages.services.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
            <Button
              type="button"
              variant="outline"
              className="mt-2 rounded-xl"
              onClick={() => {
                setServiceSubmitAttempted(false);
                setServiceEditing(buildDefaultNewServiceForm(categories));
              }}
            >
              {t("manager.pages.services.addService")}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t("manager.pages.services.assignTitle")}</CardTitle>
            <p className="text-xs text-muted-foreground">{t("manager.pages.services.assignHint")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-1 text-xs">
              <span className="text-muted-foreground">{t("manager.pages.services.pickTeacher")}</span>
              <Select
                value={assignTeacherId}
                onChange={(e) => {
                  setAssignTeacherId(e.target.value);
                  setAssignError("");
                }}
              >
                <option value="">{t("manager.pages.services.selectTeacher")}</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.email || u.id}
                  </option>
                ))}
              </Select>
            </label>

            {assignError ? (
              <div className="rounded-lg border border-amber-500/35 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">{assignError}</div>
            ) : null}

            {assignTeacherId && assignLoading ? (
              <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
            ) : assignTeacherId ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("manager.pages.services.assignServices")}</p>
                <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-border/50 bg-background/40 p-3">
                  {sortedServices.filter((s) => s.status === "active").length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("manager.pages.services.noActiveServices")}</p>
                  ) : (
                    sortedServices
                      .filter((s) => s.status === "active")
                      .map((s) => {
                        const on = assignSelected.has(String(s.id));
                        return (
                          <label
                            key={s.id}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition",
                              on ? "border-primary/50 bg-primary/10" : "border-border/50 bg-card/40 hover:bg-muted/20"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-border"
                              checked={on}
                              onChange={() => toggleServiceInAssignment(s.id)}
                            />
                            <span className="font-medium text-foreground">{s.name}</span>
                            <span className="text-muted-foreground">({s.duration} min)</span>
                          </label>
                        );
                      })
                  )}
                </div>
                <Button type="button" className="rounded-xl" disabled={assignSaving} onClick={saveAssignments}>
                  {assignSaving ? t("manager.pages.services.saving") : t("manager.pages.services.saveAssignments")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>

      <ManagerDialog
        open={Boolean(serviceEditing)}
        onClose={() => {
          setServiceSubmitAttempted(false);
          setServiceEditing(null);
        }}
        title={serviceEditing?.id ? t("manager.pages.services.editServiceTitle") : t("manager.pages.services.addServiceTitle")}
      >
        {serviceEditing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setServiceSubmitAttempted(true);
              if (!serviceFormValid) return;
              serviceActions.save({
                ...serviceEditing,
                id: serviceEditing.id,
                duration: Number(serviceEditing.duration),
                price: serviceEditing.price === "" ? null : Number(serviceEditing.price)
              });
              setServiceSubmitAttempted(false);
              setServiceEditing(null);
            }}
          >
            <Input
              value={serviceEditing.name}
              onChange={(e) => setServiceEditing({ ...serviceEditing, name: e.target.value })}
              placeholder={t("manager.pages.services.serviceNamePh")}
              className="rounded-xl"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={5}
                max={480}
                step={1}
                value={serviceEditing.duration}
                onChange={(e) => setServiceEditing({ ...serviceEditing, duration: e.target.value })}
                placeholder={t("manager.pages.services.durationPh")}
                className="rounded-xl"
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={serviceEditing.price ?? ""}
                onChange={(e) => setServiceEditing({ ...serviceEditing, price: e.target.value })}
                placeholder={t("manager.pages.services.pricePh")}
                className="rounded-xl"
              />
            </div>
            <Textarea
              value={serviceEditing.description || ""}
              onChange={(e) => setServiceEditing({ ...serviceEditing, description: e.target.value })}
              placeholder={t("manager.pages.services.descPh")}
              className="rounded-xl"
            />

            {(categories || []).length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/25 px-3 py-3 text-sm text-amber-100">
                <p className="font-medium text-foreground">{t("manager.pages.services.noCategoriesTitle")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("manager.pages.services.noCategoriesBody")}</p>
                <Link
                  href={`/manager/${businessSlug}/categories`}
                  className="mt-3 inline-flex rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/15"
                >
                  {t("manager.pages.services.goToCategories")} →
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">{t("manager.pages.services.categoryFieldLabel")}</span>
                <CategoryCombobox
                  categories={categoriesForServiceModal}
                  value={serviceEditing.categoryId || ""}
                  onChange={(id) => setServiceEditing({ ...serviceEditing, categoryId: id })}
                  placeholder={t("manager.pages.services.categoryRequired")}
                  searchPlaceholder={t("manager.pages.services.searchCategoriesPlaceholder")}
                  noResultsLabel={t("manager.pages.services.categoryNoResults")}
                  aria-invalid={
                    serviceSubmitAttempted && !String(serviceEditing.categoryId || "").trim() ? true : undefined
                  }
                  className="w-full"
                />
                {serviceSubmitAttempted && !String(serviceEditing.categoryId || "").trim() ? (
                  <p className="text-xs text-destructive">{t("manager.pages.services.categorySelectInline")}</p>
                ) : null}
              </div>
            )}

            <Button type="submit" disabled={!serviceFormValid} className="w-full rounded-xl sm:w-auto">
              {t("common.save")}
            </Button>
            {!serviceFormValid && (categories || []).length > 0 ? (
              <p className="text-[11px] text-muted-foreground">{t("manager.pages.services.saveDisabledHint")}</p>
            ) : null}
          </form>
        ) : null}
      </ManagerDialog>

      <ConfirmDialog
        open={Boolean(serviceDeleting)}
        title={t("manager.pages.services.deleteTitle")}
        description={
          serviceDeleting
            ? `${t("manager.pages.services.deletePrefix")} "${serviceDeleting.name}"?`
            : ""
        }
        onCancel={() => setServiceDeleting(null)}
        onConfirm={() => {
          if (serviceDeleting) serviceActions.delete(serviceDeleting.id);
          setServiceDeleting(null);
        }}
      />
    </>
  );
}
