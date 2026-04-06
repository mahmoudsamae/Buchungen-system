"use client";

import { useState } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { useManager } from "@/components/manager/provider";
import { ConfirmDialog, ManagerDialog } from "@/components/manager/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export default function ServicesPage() {
  const { services, serviceActions, business } = useManager();
  const { t } = useLanguage();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.services.subtitle")} />
      <main className="space-y-4 p-4 pb-10 md:p-6 md:pb-12">
        <button
          onClick={() => setEditing({ name: "", duration: 30, price: "", description: "", status: "active" })}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Add Service
        </button>
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service) => (
                <div key={service.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-snug">{service.name}</p>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge value={service.status} />
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60">
                          Actions
                          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => setEditing(service)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => serviceActions.toggleStatus(service.id)}>
                            {service.status === "active" ? "Disable" : "Enable"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive onSelect={() => setDeleting(service)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {service.duration} min{service.price != null ? ` - $${service.price}` : ""}
                  </p>
                  {service.description ? <p className="mt-1 text-xs text-muted-foreground">{service.description}</p> : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <ManagerDialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? "Edit Service" : "Add Service"}>
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              serviceActions.save({
                ...editing,
                duration: Number(editing.duration),
                price: editing.price === "" ? null : Number(editing.price)
              });
              setEditing(null);
            }}
          >
            <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Service name" />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} placeholder="Duration" />
              <Input type="number" value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} placeholder="Price" />
            </div>
            <Input
              value={editing.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="Description (optional)"
            />
            <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save</button>
          </form>
        ) : null}
      </ManagerDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete service"
        description={`Delete ${deleting?.name}?`}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) serviceActions.delete(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}
