"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const emptyForm = () => ({
  name: "",
  slug: "",
  email: "",
  phone: "",
  status: "active",
  managerFullName: "",
  managerEmail: "",
  initialPassword: ""
});

/**
 * Full-screen overlay dialog to create a tenant + manager via POST /api/super-admin/businesses.
 */
export function BusinessCreateModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setError("");
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/super-admin/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create business.");
        setLoading(false);
        return;
      }
      onCreated?.(data.business);
      onClose();
    } catch {
      setError("Network error. Try again.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        disabled={loading}
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px]"
        onClick={() => !loading && onClose()}
      />
      <Card className="relative z-10 flex max-h-[min(90vh,840px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border shadow-card">
        <div className="shrink-0 border-b px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Add business</h2>
              <p className="mt-1 text-sm text-muted-foreground">Create a tenant and the manager account used for the business dashboard.</p>
            </div>
            <button
              type="button"
              onClick={() => !loading && onClose()}
              className="rounded-md border border-border/80 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Esc
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            <div className="space-y-6">
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">Business name</span>
                    <Input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Acme Studio"
                      autoComplete="organization"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Slug</span>
                    <Input
                      required
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="acme-studio"
                      autoComplete="off"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </Select>
                  </label>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">Business email</span>
                    <Input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="hello@business.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">Phone</span>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+1 555 0100"
                      autoComplete="tel"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-3 border-t border-border/60 pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manager login</h3>
                <p className="text-xs text-muted-foreground">
                  This person signs in at <span className="font-mono text-foreground/90">/manager/login</span> to run this business.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">Full name</span>
                    <Input
                      required
                      value={form.managerFullName}
                      onChange={(e) => setForm({ ...form, managerFullName: e.target.value })}
                      placeholder="Manager name"
                      autoComplete="name"
                    />
                  </label>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">Email (login)</span>
                    <Input
                      required
                      type="email"
                      value={form.managerEmail}
                      onChange={(e) => setForm({ ...form, managerEmail: e.target.value })}
                      placeholder="manager@business.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs text-muted-foreground">Initial password</span>
                    <Input
                      required
                      type="password"
                      minLength={8}
                      value={form.initialPassword}
                      onChange={(e) => setForm({ ...form, initialPassword: e.target.value })}
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                    />
                    <span className="mt-1 block text-[11px] text-muted-foreground">Stored securely by Supabase Auth — never shown again in this UI.</span>
                  </label>
                </div>
              </section>
            </div>

            {error ? (
              <div className="mt-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                {error}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t bg-muted/20 px-5 py-4 sm:px-6">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={loading}
                onClick={() => onClose()}
                className="rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-60"
              >
                {loading ? "Creating…" : "Create business"}
              </button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
