"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Topbar } from "@/components/navigation/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ManagerDialog } from "@/components/manager/dialog";

export default function PlatformOwnerAdminsPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/super-admin/owner/admins");
    if (!res.ok) {
      setToast("Could not load platform staff.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setStaff(data.staff || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const setSuspended = async (userId, suspended) => {
    const res = await fetch(`/api/super-admin/owner/admins/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended })
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setToast(j.error || "Update failed.");
      return;
    }
    setToast(suspended ? "Administrator suspended." : "Administrator reactivated.");
    load();
  };

  return (
    <>
      <Topbar title="Platform administrators" subtitle="Owner-only — manage platform staff" showSearch={false} />
      <main className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/super-admin/owner" className="text-xs text-muted-foreground hover:text-foreground">
            ← Owner workspace
          </Link>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Invite platform admin
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform staff</CardTitle>
            <p className="text-xs text-muted-foreground">
              Platform owners cannot be suspended from this screen. Suspending a platform admin blocks platform sign-in until reactivated.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Name", "Email", "Role", "Status", "Legacy flag", "Joined", "Actions"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                          No platform staff found.
                        </td>
                      </tr>
                    ) : (
                      staff.map((row) => {
                        const isOwner = row.staffRole === "platform_owner";
                        return (
                          <tr key={row.id} className="border-t hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium">{row.fullName || "—"}</td>
                            <td className="px-3 py-2">{row.email || "—"}</td>
                            <td className="px-3 py-2 capitalize">{row.staffRole.replace("platform_", "")}</td>
                            <td className="px-3 py-2">
                              {isOwner ? (
                                <span className="text-xs text-muted-foreground">Always active</span>
                              ) : row.suspended ? (
                                <span className="text-xs font-medium text-amber-600">Suspended</span>
                              ) : (
                                <span className="text-xs text-success">Active</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{row.legacySuperAdminFlag ? "Yes" : "No"}</td>
                            <td className="px-3 py-2 text-muted-foreground">{row.createdAt || "—"}</td>
                            <td className="px-3 py-2">
                              {!isOwner ? (
                                <div className="flex flex-wrap gap-1">
                                  {!row.suspended ? (
                                    <button
                                      type="button"
                                      onClick={() => setSuspended(row.id, true)}
                                      className="rounded border px-2 py-1 text-xs hover:bg-muted"
                                    >
                                      Suspend
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setSuspended(row.id, false)}
                                      className="rounded border px-2 py-1 text-xs hover:bg-muted"
                                    >
                                      Reactivate
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <CreateAdminDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} onToast={setToast} />

      {toast ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border bg-card px-4 py-3 text-sm shadow-card">{toast}</div>
      ) : null}
    </>
  );
}

function CreateAdminDialog({ open, onClose, onCreated, onToast }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/super-admin/owner/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, initialPassword })
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      onToast(j.error || "Create failed.");
      return;
    }
    onToast("Platform admin created.");
    setFullName("");
    setEmail("");
    setInitialPassword("");
    onClose();
    onCreated();
  };

  return (
    <ManagerDialog open={open} onClose={onClose} title="Invite platform admin">
      <form className="space-y-3 text-sm" onSubmit={submit}>
        <label className="block text-xs text-muted-foreground">
          Full name
          <Input className="mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </label>
        <label className="block text-xs text-muted-foreground">
          Email (login)
          <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="block text-xs text-muted-foreground">
          Initial password (min 8 characters)
          <Input
            className="mt-1"
            type="password"
            autoComplete="new-password"
            value={initialPassword}
            onChange={(e) => setInitialPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="rounded-md border px-4 py-2" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
            {busy ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </ManagerDialog>
  );
}
