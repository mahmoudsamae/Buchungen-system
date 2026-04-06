"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/navigation/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { ManagerDialog } from "@/components/manager/dialog";
import { BusinessCreateModal } from "@/components/super-admin/business-create-modal";

export default function SuperAdminBusinessesPage() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [detail, setDetail] = useState(null);
  const [destroyTarget, setDestroyTarget] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState("");

  const load = async () => {
    const res = await fetch("/api/super-admin/businesses");
    if (!res.ok) return;
    const data = await res.json();
    setRows(data.businesses || []);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.manager?.email?.toLowerCase().includes(q);
      const matchesStatus = status === "all" || r.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [rows, query, status]);

  const patchBusiness = async (id, body) => {
    const res = await fetch(`/api/super-admin/businesses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      setToast("Update failed.");
      return;
    }
    setToast("Business updated.");
    load();
  };

  return (
    <>
      <Topbar title="Businesses" subtitle="All tenants" showSearch={false} />
      <main className="space-y-4 p-4 md:p-6">
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-3">
            <Input placeholder="Search name, slug, manager email…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Select>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95"
            >
              Add business
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {[
                      "Business",
                      "Slug",
                      "Manager",
                      "Manager email",
                      "Phone",
                      "Status",
                      "Created",
                      "Bookings",
                      "Users",
                      "Actions"
                    ].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                        No businesses match filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((b) => (
                      <tr key={b.id} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-2 font-medium">{b.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{b.slug}</td>
                        <td className="px-3 py-2">{b.manager?.fullName}</td>
                        <td className="px-3 py-2">{b.manager?.email}</td>
                        <td className="px-3 py-2">{b.phone}</td>
                        <td className="px-3 py-2">
                          <StatusBadge value={b.status} />
                        </td>
                        <td className="px-3 py-2">{b.createdAt}</td>
                        <td className="px-3 py-2">{b.totalBookings}</td>
                        <td className="px-3 py-2">{b.totalUsers}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            <Link href={`/super-admin/businesses/${b.id}`} className="rounded border px-2 py-1 text-xs hover:bg-muted">
                              View
                            </Link>
                            <button type="button" onClick={() => setDetail(b)} className="rounded border px-2 py-1 text-xs hover:bg-muted">
                              Quick edit
                            </button>
                            <button
                              type="button"
                              onClick={() => patchBusiness(b.id, { status: "suspended" })}
                              className="rounded border px-2 py-1 text-xs hover:bg-muted"
                            >
                              Suspend
                            </button>
                            <button
                              type="button"
                              onClick={() => patchBusiness(b.id, { status: "active" })}
                              className="rounded border px-2 py-1 text-xs hover:bg-muted"
                            >
                              Activate
                            </button>
                            <button
                              type="button"
                              onClick={() => setDestroyTarget(b)}
                              className="rounded border px-2 py-1 text-xs text-danger hover:bg-danger/10"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <ManagerDialog open={Boolean(detail)} onClose={() => setDetail(null)} title="Edit business">
        {detail ? (
          <QuickEditForm
            business={detail}
            onSave={async (payload) => {
              await patchBusiness(detail.id, payload);
              setDetail(null);
            }}
          />
        ) : null}
      </ManagerDialog>

      <DestroyBusinessDialog
        open={Boolean(destroyTarget)}
        business={destroyTarget}
        onClose={() => setDestroyTarget(null)}
        onDone={() => {
          setDestroyTarget(null);
          load();
          setToast("Business deleted.");
        }}
      />

      <BusinessCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setToast("Business and manager created successfully.");
          load();
        }}
      />

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border bg-card px-4 py-3 text-sm shadow-card">{toast}</div>
      ) : null}
    </>
  );
}

function QuickEditForm({ business, onSave }) {
  const [form, setForm] = useState({
    name: business.name,
    slug: business.slug,
    email: business.email,
    phone: business.phone,
    status: business.status
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
        <option value="active">active</option>
        <option value="inactive">inactive</option>
        <option value="suspended">suspended</option>
      </Select>
      <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Save
      </button>
    </form>
  );
}

function DestroyBusinessDialog({ open, business, onClose, onDone }) {
  const [phrase, setPhrase] = useState("");
  const [name, setName] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");

  const confirm = async () => {
    if (!business) return;
    setError("");
    const res = await fetch(`/api/super-admin/businesses/${business.id}/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmPhrase: phrase,
        businessNameConfirm: name,
        adminSecret: secret
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Delete failed.");
      return;
    }
    onDone();
    onClose();
    setPhrase("");
    setName("");
    setSecret("");
  };

  return (
    <ManagerDialog open={open} onClose={onClose} title="Destroy business (protected)">
      {business ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Type <span className="font-mono">DELETE</span>, the exact business name, and your Super Admin secret. This cannot be undone.
          </p>
          <Input placeholder="Type DELETE" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
          <Input placeholder={`Exact name: ${business.name}`} value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="password" placeholder="SUPER_ADMIN_SECRET" value={secret} onChange={(e) => setSecret(e.target.value)} />
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
            <button type="button" onClick={confirm} className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white">
              Destroy permanently
            </button>
          </div>
        </div>
      ) : null}
    </ManagerDialog>
  );
}
