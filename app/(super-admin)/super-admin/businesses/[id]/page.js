"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/navigation/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { ManagerDialog } from "@/components/manager/dialog";

const tabs = ["Overview", "Manager", "Users", "Bookings", "Services", "Availability", "Settings", "Security"];

export default function BusinessDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [tab, setTab] = useState("Overview");
  const [business, setBusiness] = useState(null);
  const [toast, setToast] = useState("");
  const [destroyOpen, setDestroyOpen] = useState(false);
  const [canMutate, setCanMutate] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/super-admin/businesses/${id}`);
    if (res.status === 404) {
      router.push("/super-admin/businesses");
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    setBusiness(data.business);
  };

  useEffect(() => {
    load();
    (async () => {
      const res = await fetch("/api/super-admin/session");
      if (!res.ok) return;
      const s = await res.json().catch(() => ({}));
      setCanMutate(Boolean(s.isPlatformOwner));
    })();
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const savePatch = async (patch) => {
    if (!canMutate) return;
    const res = await fetch(`/api/super-admin/businesses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!res.ok) {
      setToast("Save failed.");
      return;
    }
    const data = await res.json();
    setBusiness(data.business);
    setToast("Saved.");
  };

  if (!business) {
    return <p className="p-6 text-sm text-muted-foreground">Loading business…</p>;
  }

  return (
    <>
      <Topbar
        title={business.name}
        subtitle={`Business (tenant) · ${business.slug} · ${business.id}`}
        showSearch={false}
      />
      <main className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap gap-2">
          <Link href="/super-admin/businesses" className="text-xs text-muted-foreground hover:text-foreground">
            ← All businesses
          </Link>
          <StatusBadge value={business.status} />
          {canMutate ? (
            <button type="button" onClick={() => setDestroyOpen(true)} className="ml-auto text-xs text-danger hover:underline">
              Delete business…
            </button>
          ) : (
            <span className="ml-auto text-xs text-muted-foreground">View-only (owner edits)</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-2">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                tab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" ? <OverviewTab business={business} onSave={savePatch} /> : null}
        {tab === "Manager" ? <ManagerTab business={business} onSave={savePatch} /> : null}
        {tab === "Users" ? <UsersTab users={business.users || []} /> : null}
        {tab === "Bookings" ? <BookingsTab bookings={business.bookings || []} /> : null}
        {tab === "Services" ? <ServicesTab services={business.services || []} /> : null}
        {tab === "Availability" ? <AvailabilityTab availability={business.availability || []} /> : null}
        {tab === "Settings" ? <SettingsTab settings={business.settings} onSave={savePatch} readOnly={!canMutate} /> : null}
        {tab === "Security" ? (
          <SecurityTab
            business={business}
            onSecurityChange={load}
            onToast={setToast}
            readOnly={!canMutate}
          />
        ) : null}
      </main>

      {canMutate ? (
        <DestroyModal open={destroyOpen} business={business} onClose={() => setDestroyOpen(false)} onDone={() => router.push("/super-admin/businesses")} />
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border bg-card px-4 py-3 text-sm shadow-card">{toast}</div>
      ) : null}
    </>
  );
}

function OverviewTab({ business, onSave, readOnly }) {
  const [form, setForm] = useState({
    name: business.name,
    slug: business.slug,
    email: business.email,
    phone: business.phone,
    status: business.status
  });

  useEffect(() => {
    setForm({
      name: business.name,
      slug: business.slug,
      email: business.email,
      phone: business.phone,
      status: business.status
    });
  }, [business]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {readOnly ? (
          <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            View-only: only the platform owner can change tenant fields.
          </p>
        ) : null}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">End customers</p>
          <p className="mt-1">
            Customer accounts for this tenant are owned by the <strong>business manager</strong> inside the manager dashboard — not created here.
          </p>
          <p className="mt-2">
            Customer accounts:{" "}
            <span className="font-semibold text-foreground">{business.customerCount ?? "—"}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            Bookings: <span className="font-semibold text-foreground">{business.totalBookings ?? "—"}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            Members: <span className="font-semibold text-foreground">{business.totalUsers ?? "—"}</span>
          </p>
        </div>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={readOnly} />
        <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={readOnly} />
        <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={readOnly} />
        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={readOnly} />
        <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} disabled={readOnly}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="suspended">suspended</option>
        </Select>
        {!readOnly ? (
          <button type="button" onClick={() => onSave(form)} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            Save overview
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ManagerTab({ business, onSave, readOnly }) {
  const [manager, setManager] = useState({ ...business.manager });

  useEffect(() => {
    setManager({ ...business.manager });
  }, [business.manager]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manager account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {readOnly ? (
          <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">View-only.</p>
        ) : null}
        <Input value={manager.fullName} onChange={(e) => setManager({ ...manager, fullName: e.target.value })} disabled={readOnly} />
        <Input value={manager.email} onChange={(e) => setManager({ ...manager, email: e.target.value })} disabled={readOnly} />
        <Input
          value={manager.username || ""}
          onChange={(e) => setManager({ ...manager, username: e.target.value || null })}
          placeholder="Username (optional)"
          disabled={readOnly}
        />
        <Select value={manager.status} onChange={(e) => setManager({ ...manager, status: e.target.value })} disabled={readOnly}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="suspended">suspended</option>
        </Select>
        {!readOnly ? (
          <button type="button" onClick={() => onSave({ manager })} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            Save manager
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function UsersTab({ users }) {
  if (!users.length) {
    return <EmptyState title="No users" description="Team members will appear here for this tenant." />;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users / Team</CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          Staff and manager accounts for this business. Booking customers (end users) are created and managed in the manager dashboard, not here.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              {["Name", "Email", "Role", "Status", "Created"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.fullName}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2 capitalize">{u.role}</td>
                <td className="px-3 py-2">
                  <StatusBadge value={u.status} />
                </td>
                <td className="px-3 py-2">{u.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function BookingsTab({ bookings }) {
  if (!bookings.length) return <EmptyState title="No bookings" description="Booking rows for this tenant (platform view)." />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto text-sm">
        <table className="w-full">
          <thead>
            <tr>
              {["ID", "Customer", "Service", "Date", "Time", "Status"].map((h) => (
                <th key={h} className="px-2 py-2 text-left text-xs text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="px-2 py-2">{b.id}</td>
                <td className="px-2 py-2">{b.customer}</td>
                <td className="px-2 py-2">{b.service}</td>
                <td className="px-2 py-2">{b.date}</td>
                <td className="px-2 py-2">{b.time}</td>
                <td className="px-2 py-2">
                  <StatusBadge value={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ServicesTab({ services }) {
  if (!services.length) return <EmptyState title="No services" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Services</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 md:grid-cols-2">
        {services.map((s) => (
          <div key={s.id} className="rounded-lg border p-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">{s.name}</span>
              <StatusBadge value={s.status} />
            </div>
            <p className="text-muted-foreground">
              {s.duration} min · ${s.price}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AvailabilityTab({ availability }) {
  if (!availability.length) return <EmptyState title="No availability" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability (summary)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {availability.map((row) => (
          <div key={row.day}>
            <p className="font-medium">{row.day}</p>
            <p className="text-muted-foreground">
              {(row.slots || []).map((s) => `${s.time}${s.enabled ? "" : " (off)"}`).join(", ") || "—"}
            </p>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Platform overrides can mirror manager availability editor after DB sync.</p>
      </CardContent>
    </Card>
  );
}

function SettingsTab({ settings, onSave, readOnly }) {
  const [form, setForm] = useState(settings || {});

  useEffect(() => {
    setForm(settings || {});
  }, [settings]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {readOnly ? (
          <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">View-only.</p>
        ) : null}
        <Input
          value={form.timezone || ""}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          placeholder="Timezone"
          disabled={readOnly}
        />
        <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          Auto-confirm
          <input
            type="checkbox"
            checked={Boolean(form.autoConfirm)}
            onChange={(e) => setForm({ ...form, autoConfirm: e.target.checked })}
            disabled={readOnly}
          />
        </label>
        <Input
          value={form.bookingPolicy || ""}
          onChange={(e) => setForm({ ...form, bookingPolicy: e.target.value })}
          placeholder="Booking policy"
          disabled={readOnly}
        />
        {!readOnly ? (
          <button type="button" onClick={() => onSave({ settings: form })} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            Save settings
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SecurityTab({ business, onSecurityChange, onToast, readOnly }) {
  const [initialPassword, setInitialPassword] = useState("");
  const [loginDisabled, setLoginDisabled] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  useEffect(() => {
    setLoginDisabled(Boolean(business.manager?.loginDisabled));
    setForcePasswordChange(Boolean(business.manager?.forcePasswordChange));
  }, [business.manager]);

  const apply = async () => {
    if (readOnly) return;
    const res = await fetch(`/api/super-admin/businesses/${business.id}/manager/security`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initialPassword: initialPassword || undefined,
        loginDisabled,
        forcePasswordChange
      })
    });
    if (!res.ok) {
      onToast("Security update failed.");
      return;
    }
    onToast("Security settings updated.");
    setInitialPassword("");
    onSecurityChange();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {readOnly ? (
          <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            View-only: platform owner manages manager security.
          </p>
        ) : null}
        <p className="text-muted-foreground">Never display existing passwords. Set a new initial password or toggle access flags only.</p>
        <label className="flex items-center justify-between rounded-md border px-3 py-2">
          Disable manager login
          <input
            type="checkbox"
            checked={loginDisabled}
            onChange={(e) => setLoginDisabled(e.target.checked)}
            disabled={readOnly}
          />
        </label>
        <label className="flex items-center justify-between rounded-md border px-3 py-2">
          Force password change on next login
          <input
            type="checkbox"
            checked={forcePasswordChange}
            onChange={(e) => setForcePasswordChange(e.target.checked)}
            disabled={readOnly}
          />
        </label>
        <Input
          type="password"
          placeholder="New initial password (min 8 chars)"
          value={initialPassword}
          onChange={(e) => setInitialPassword(e.target.value)}
          disabled={readOnly}
        />
        {!readOnly ? (
          <button type="button" onClick={apply} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            Apply security changes
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }) {
  return (
    <Card>
      <CardContent className="p-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{title}</p>
        {description ? <p className="mt-2">{description}</p> : null}
      </CardContent>
    </Card>
  );
}

function DestroyModal({ open, business, onClose, onDone }) {
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
      setError(data.error || "Failed.");
      return;
    }
    onDone();
    onClose();
  };

  return (
    <ManagerDialog open={open} onClose={onClose} title="Destroy business">
      {business ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Type DELETE, exact business name, and Super Admin secret.</p>
          <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="DELETE" />
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name" />
          <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Secret" />
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <button type="button" className="rounded-md border px-3 py-2" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="rounded-md bg-danger px-3 py-2 text-white" onClick={confirm}>
              Destroy
            </button>
          </div>
        </div>
      ) : null}
    </ManagerDialog>
  );
}
