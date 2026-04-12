"use client";

import { useState } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { ChevronDown } from "lucide-react";

export default function CategoriesPage() {
  const { categories, services, categoryActions, serviceActions, business } = useManager();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [serviceEditing, setServiceEditing] = useState(null);
  const [serviceDeleting, setServiceDeleting] = useState(null);

  const servicesByCategory = categories.map((category) => ({
    ...category,
    services: services.filter((s) => s.categoryId === category.id)
  }));
  const uncategorized = services.filter((s) => !s.categoryId);

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.categories.subtitle")} />
      <main className="space-y-4 p-4 pb-10 md:p-6 md:pb-12">
        <button
          onClick={() => setEditing({ name: "", description: "", status: "active" })}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Add category
        </button>

        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              {servicesByCategory.map((category) => (
                <div key={category.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium leading-snug">{category.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{category.services.length} service(s)</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge value={category.status} />
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60">
                          Actions
                          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => setEditing(category)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => categoryActions.toggleStatus(category.id)}>
                            {category.status === "active" ? "Disable" : "Enable"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setDeleting(category)}>
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {category.description ? (
                    <p className="mt-2 text-xs text-muted-foreground">{category.description}</p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No description</p>
                  )}
                  <div className="mt-3 space-y-2">
                    {category.services.length === 0 ? (
                      <p className="rounded-md border border-dashed border-border/70 bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
                        No services in this category yet.
                      </p>
                    ) : (
                      category.services.map((service) => (
                        <div key={service.id} className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/10 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{service.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {service.duration} min{service.price != null ? ` • $${service.price}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge value={service.status} />
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60">
                                Actions
                                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onSelect={() => setServiceEditing(service)}>Edit service</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => serviceActions.toggleStatus(service.id)}>
                                  {service.status === "active" ? "Disable" : "Enable"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem destructive onSelect={() => setServiceDeleting(service)}>
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))
                    )}
                    <button
                      type="button"
                      className="rounded-md border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
                      onClick={() =>
                        setServiceEditing({
                          name: "",
                          duration: 30,
                          price: "",
                          description: "",
                          status: "active",
                          categoryId: category.id
                        })
                      }
                    >
                      Add service to {category.name}
                    </button>
                  </div>
                </div>
              ))}
              {uncategorized.length ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                  <p className="font-medium text-amber-300">Uncategorized services need assignment</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Services should belong to a training category. Reassign these from Edit service.
                  </p>
                  <div className="mt-3 space-y-2">
                    {uncategorized.map((service) => (
                      <div key={service.id} className="flex items-center justify-between rounded-md border border-border/70 bg-card/70 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium">{service.name}</p>
                          <p className="text-xs text-muted-foreground">{service.duration} min</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted"
                          onClick={() => setServiceEditing(service)}
                        >
                          Assign category
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </main>

      <ManagerDialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit Category" : "Add Category"}
      >
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await categoryActions.save(editing);
              if (ok) setEditing(null);
            }}
          >
            <Input
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Category name (e.g. Car / PKW)"
            />
            <Textarea
              value={editing.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Optional description"
            />
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Save
            </button>
          </form>
        ) : null}
      </ManagerDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Archive category"
        description={`Archive ${deleting?.name}? Existing assignments remain; category becomes inactive.`}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) categoryActions.delete(deleting.id);
          setDeleting(null);
        }}
      />

      <ManagerDialog
        open={Boolean(serviceEditing)}
        onClose={() => setServiceEditing(null)}
        title={serviceEditing?.id ? "Edit Service" : "Add Service"}
      >
        {serviceEditing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!serviceEditing.categoryId) return;
              serviceActions.save({
                ...serviceEditing,
                duration: Number(serviceEditing.duration),
                price: serviceEditing.price === "" ? null : Number(serviceEditing.price)
              });
              setServiceEditing(null);
            }}
          >
            <Input
              value={serviceEditing.name}
              onChange={(e) => setServiceEditing({ ...serviceEditing, name: e.target.value })}
              placeholder="Service name"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                value={serviceEditing.duration}
                onChange={(e) => setServiceEditing({ ...serviceEditing, duration: e.target.value })}
                placeholder="Duration"
              />
              <Input
                type="number"
                value={serviceEditing.price}
                onChange={(e) => setServiceEditing({ ...serviceEditing, price: e.target.value })}
                placeholder="Price"
              />
            </div>
            <Input
              value={serviceEditing.description || ""}
              onChange={(e) => setServiceEditing({ ...serviceEditing, description: e.target.value })}
              placeholder="Description (optional)"
            />
            <Select
              value={serviceEditing.categoryId || ""}
              onChange={(e) => setServiceEditing({ ...serviceEditing, categoryId: e.target.value })}
            >
              <option value="">Select category (required)</option>
              {categories.filter((c) => c.is_active || c.id === serviceEditing.categoryId).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {!serviceEditing.categoryId ? (
              <p className="text-xs text-danger">Category is required for services.</p>
            ) : null}
            <button
              disabled={!serviceEditing.categoryId}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              Save
            </button>
          </form>
        ) : null}
      </ManagerDialog>

      <ConfirmDialog
        open={Boolean(serviceDeleting)}
        title="Delete service"
        description={`Delete ${serviceDeleting?.name}?`}
        onCancel={() => setServiceDeleting(null)}
        onConfirm={() => {
          if (serviceDeleting) serviceActions.delete(serviceDeleting.id);
          setServiceDeleting(null);
        }}
      />
    </>
  );
}
