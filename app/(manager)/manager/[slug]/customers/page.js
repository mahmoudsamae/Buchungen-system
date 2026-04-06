"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useManager } from "@/components/manager/provider";
import { ConfirmDialog, ManagerDialog } from "@/components/manager/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { ChevronDown } from "lucide-react";

const emptyCustomer = { fullName: "", email: "", phone: "", password: "", status: "active" };

export default function CustomersPage() {
  const { customers, bookings, customerActions, business } = useManager();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyCustomer);
  const [editing, setEditing] = useState(null);
  const [editNewPw, setEditNewPw] = useState("");
  const [editNewPw2, setEditNewPw2] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [pwCustomer, setPwCustomer] = useState(null);
  const [pwForm, setPwForm] = useState({ pw1: "", pw2: "" });
  const [editPwError, setEditPwError] = useState("");

  const bookingRowsForCustomer = useMemo(() => {
    if (!historyCustomer) return [];
    return bookings
      .filter((b) => b.customerUserId === historyCustomer.id)
      .sort((a, b) => {
        const d = String(b.date || "").localeCompare(String(a.date || ""));
        if (d !== 0) return d;
        return String(b.time || "").localeCompare(String(a.time || ""));
      });
  }, [bookings, historyCustomer]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const matchQ =
        !q ||
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q));
      const matchS = statusFilter === "all" || c.status === statusFilter;
      return matchQ && matchS;
    });
  }, [customers, query, statusFilter]);

  const openEdit = (c) => {
    setEditing({ ...c });
    setEditNewPw("");
    setEditNewPw2("");
    setEditPwError("");
  };

  return (
    <>
      <PageHeader businessName={business?.name} subtitle={t("manager.pages.customers.subtitle")} />
      <main className="space-y-4 p-4 pb-10 md:p-6 md:pb-12">
        <Card className="border-primary/20 bg-primary/[0.06] ring-1 ring-primary/10">
          <CardContent className="p-5 text-sm leading-relaxed text-muted-foreground">
            <p className="font-semibold text-foreground">{t("manager.customers.lead.title")}</p>
            <p className="mt-2">{t("manager.customers.lead.body")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">Search</label>
              <Input placeholder="Name, email, or phone" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="w-full space-y-1 md:w-48">
              <label className="text-xs text-muted-foreground">Filter by status</label>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
            <button
              type="button"
              onClick={() => {
                setAddForm(emptyCustomer);
                setAddOpen(true);
              }}
              className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Add customer
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Full name", "Sign-in email", "Phone", "Status", "Created", "Actions"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                        No customers match your filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr key={c.id} className="border-t hover:bg-muted/15">
                        <td className="px-3 py-2 font-medium">{c.fullName}</td>
                        <td className="px-3 py-2">{c.email}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.phone || "—"}</td>
                        <td className="px-3 py-2">
                          <StatusBadge value={c.status} />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{c.createdAt}</td>
                        <td className="px-3 py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60">
                              Actions
                              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem onSelect={() => openEdit(c)}>Edit customer</DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setHistoryCustomer(c);
                                }}
                              >
                                View booking history
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {c.status !== "active" ? (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    customerActions.setStatus(c.id, "active");
                                  }}
                                >
                                  Activate
                                </DropdownMenuItem>
                              ) : null}
                              {c.status !== "suspended" ? (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    customerActions.setStatus(c.id, "suspended");
                                  }}
                                >
                                  Suspend
                                </DropdownMenuItem>
                              ) : null}
                              {c.status !== "inactive" ? (
                                <DropdownMenuItem
                                  onSelect={() => {
                                    customerActions.setStatus(c.id, "inactive");
                                  }}
                                >
                                  Set inactive
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => {
                                  setPwCustomer(c);
                                  setPwForm({ pw1: "", pw2: "" });
                                }}
                              >
                                Set new password…
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                destructive
                                onSelect={() => {
                                  setDeleting(c);
                                }}
                              >
                                Delete customer…
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <ManagerDialog open={addOpen} onClose={() => setAddOpen(false)} title="Add customer account">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!addForm.fullName.trim() || !addForm.email.trim() || addForm.password.length < 8) return;
            customerActions.save({
              fullName: addForm.fullName.trim(),
              email: addForm.email.trim(),
              phone: addForm.phone.trim(),
              password: addForm.password,
              status: addForm.status
            });
            setAddOpen(false);
            setAddForm(emptyCustomer);
          }}
        >
          <p className="text-xs text-muted-foreground">
            Creates a Supabase Auth user and links them to this business as <code className="rounded bg-muted px-1 text-[11px]">customer</code> (active by default on the server).
          </p>
          <Input
            required
            placeholder="Full name"
            value={addForm.fullName}
            onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
            autoComplete="name"
          />
          <Input
            required
            type="email"
            placeholder="Sign-in email"
            value={addForm.email}
            onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            autoComplete="email"
          />
          <Input placeholder="Phone (optional)" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} autoComplete="tel" />
          <Input
            required
            type="password"
            minLength={8}
            placeholder="Initial password (min 8 characters)"
            value={addForm.password}
            onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
            autoComplete="new-password"
          />
          <Select value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="suspended">suspended</option>
          </Select>
          <button type="submit" className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Create customer account
          </button>
        </form>
      </ManagerDialog>

      <ManagerDialog
        open={Boolean(editing)}
        onClose={() => {
          setEditing(null);
          setEditNewPw("");
          setEditNewPw2("");
          setEditPwError("");
        }}
        title="Edit customer"
      >
        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setEditPwError("");
              const np = editNewPw.trim();
              const np2 = editNewPw2.trim();
              if (np.length > 0 || np2.length > 0) {
                if (np.length < 8) {
                  setEditPwError("New password must be at least 8 characters.");
                  return;
                }
                if (np !== np2) {
                  setEditPwError("New password fields do not match.");
                  return;
                }
              }
              customerActions.save({
                ...editing,
                fullName: editing.fullName.trim(),
                email: editing.email.trim(),
                phone: editing.phone?.trim() || "",
                status: editing.status,
                newPassword: np.length >= 8 ? np : undefined
              });
              setEditing(null);
              setEditNewPw("");
              setEditNewPw2("");
              setEditPwError("");
            }}
          >
            <p className="text-xs text-muted-foreground">
              The current password is never shown. Leave new password fields empty to keep the existing password.
            </p>
            {editPwError ? <p className="text-xs text-danger">{editPwError}</p> : null}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Full name</label>
              <Input value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} placeholder="Full name" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Sign-in email</label>
              <Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} placeholder="Sign-in email" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input value={editing.phone || ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="Phone" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="active">Active — can use portal</option>
                <option value="inactive">Inactive — blocked from portal</option>
                <option value="suspended">Suspended — blocked from portal</option>
              </Select>
            </div>
            <div className="rounded-md border border-border/80 bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">Set new password (optional)</p>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="New password (min 8 chars)"
                value={editNewPw}
                onChange={(e) => setEditNewPw(e.target.value)}
              />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={editNewPw2}
                onChange={(e) => setEditNewPw2(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Save changes
              </button>
              <button
                type="button"
                className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                onClick={() => {
                  setEditing(null);
                  setEditNewPw("");
                  setEditNewPw2("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </ManagerDialog>

      <ManagerDialog open={Boolean(pwCustomer)} onClose={() => setPwCustomer(null)} title="Set new password">
        {pwCustomer ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const p1 = pwForm.pw1.trim();
              const p2 = pwForm.pw2.trim();
              if (p1.length < 8 || p1 !== p2) return;
              customerActions.resetPassword(pwCustomer.id, p1);
              setPwCustomer(null);
              setPwForm({ pw1: "", pw2: "" });
            }}
          >
            <p className="text-xs text-muted-foreground">
              Sets a new password immediately for <strong className="text-foreground">{pwCustomer.email}</strong>. The previous password is not required.
            </p>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="New password (min 8 characters)"
              value={pwForm.pw1}
              onChange={(e) => setPwForm((f) => ({ ...f, pw1: e.target.value }))}
            />
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Confirm new password"
              value={pwForm.pw2}
              onChange={(e) => setPwForm((f) => ({ ...f, pw2: e.target.value }))}
            />
            {pwForm.pw1.length > 0 && pwForm.pw1.length < 8 ? (
              <p className="text-xs text-danger">Use at least 8 characters.</p>
            ) : null}
            {pwForm.pw1.length >= 8 && pwForm.pw2.length > 0 && pwForm.pw1 !== pwForm.pw2 ? (
              <p className="text-xs text-danger">Passwords do not match.</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={pwForm.pw1.length < 8 || pwForm.pw1 !== pwForm.pw2}>
                Save password
              </button>
              <button
                type="button"
                className="text-xs text-muted-foreground underline hover:text-foreground"
                onClick={() => {
                  customerActions.resetPassword(pwCustomer.id);
                  setPwCustomer(null);
                  setPwForm({ pw1: "", pw2: "" });
                }}
              >
                Send recovery email instead
              </button>
            </div>
          </form>
        ) : null}
      </ManagerDialog>

      <ManagerDialog open={Boolean(historyCustomer)} onClose={() => setHistoryCustomer(null)} title="Booking history" wide>
        {historyCustomer ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Bookings for <strong className="text-foreground">{historyCustomer.fullName}</strong>
            </p>
            {bookingRowsForCustomer.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings yet.</p>
            ) : (
              <div className="max-h-[min(24rem,60vh)] overflow-auto rounded-md border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Time</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingRowsForCustomer.map((b) => (
                      <tr key={b.id} className="border-t border-border/40">
                        <td className="px-3 py-2 whitespace-nowrap">{b.date}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {b.time}
                          {b.endTime ? `–${b.endTime}` : ""}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge value={b.status} />
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{b.notes?.trim() ? b.notes : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button type="button" className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted" onClick={() => setHistoryCustomer(null)}>
              Close
            </button>
          </div>
        ) : null}
      </ManagerDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove customer from business?"
        description={`This removes ${deleting?.fullName || "this customer"} from your business. Their booking history stays in your records. The login account is not deleted automatically (past bookings still reference it). You can re-add the same email later if needed.`}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) customerActions.delete(deleting.id);
          setDeleting(null);
        }}
      />
    </>
  );
}
