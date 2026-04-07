"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/navigation/page-header";
import { useLanguage } from "@/components/i18n/language-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useManager } from "@/components/manager/provider";
import { ChevronDown } from "lucide-react";
import { ConfirmDialog, ManagerDialog } from "@/components/manager/dialog";
import { ManualBookingDialog } from "@/components/manager/manual-booking-dialog";
import { RescheduleBookingDialog } from "@/components/manager/reschedule-booking-dialog";
import { CompleteLessonDialog } from "@/components/manager/complete-lesson-dialog";
import { cn } from "@/lib/utils";
import { BOOKING_TERMINAL_STATUSES } from "@/lib/manager/booking-constants";

function NoteTextarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "min-h-[88px] w-full rounded-md border bg-card px-3 py-2 text-sm outline-none ring-primary placeholder:text-muted-foreground focus:ring-2",
        className
      )}
      {...props}
    />
  );
}

function sourceLabel(src) {
  if (src === "manual") return "Manual";
  if (src === "portal") return "Customer portal";
  return "Legacy / other";
}

function formatTs(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

function BookingActionsMenu({
  item,
  locked,
  onDetail,
  onEdit,
  onReschedule,
  onAccept,
  onCancel,
  onNoShow,
  onComplete,
  onDelete
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60">
        Actions
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => onDetail(item)}>Details</DropdownMenuItem>
        {!locked ? <DropdownMenuItem onSelect={() => onEdit(item)}>Edit</DropdownMenuItem> : null}
        {item.status === "pending" ? (
          <>
            <DropdownMenuItem onSelect={() => onAccept(item)}>Accept booking</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCancel(item)}>Cancel booking</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onReschedule(item)}>Reschedule</DropdownMenuItem>
          </>
        ) : null}
        {item.status === "confirmed" ? (
          <>
            <DropdownMenuItem onSelect={() => onComplete(item)}>Complete lesson</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onNoShow(item)}>Mark no-show</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCancel(item)}>Cancel booking</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onReschedule(item)}>Reschedule</DropdownMenuItem>
          </>
        ) : null}
        {locked ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => onDelete(item)}>
              Delete
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function BookingsPage() {
  const { bookings, bookingActions, customers, services, business } = useManager();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [completeFor, setCompleteFor] = useState(null);

  const filtered = useMemo(
    () =>
      bookings.filter((b) => {
        const byQuery =
          !query ||
          b.id.toLowerCase().includes(query.toLowerCase()) ||
          b.customer.toLowerCase().includes(query.toLowerCase());
        const byStatus = status === "all" || b.status === status;
        const byDate = !dateFilter || b.date === dateFilter;
        return byQuery && byStatus && byDate;
      }),
    [bookings, query, status, dateFilter]
  );

  return (
    <>
      <PageHeader
        businessName={business?.name}
        subtitle={t("manager.pages.bookings.subtitle")}
        actions={
          <Button type="button" className="rounded-xl shadow-sm" onClick={() => setNewOpen(true)}>
            New booking
          </Button>
        }
      />
      <main className="space-y-4 p-4 pb-10 md:p-6 md:pb-12">
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-3">
            <Input placeholder="Search booking or customer" value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-show</option>
              <option value="rescheduled">Rescheduled</option>
            </Select>
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3 md:hidden">
              {filtered.length === 0 ? (
                <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">No results.</p>
              ) : (
                filtered.map((item) => {
                  const locked = BOOKING_TERMINAL_STATUSES.includes(item.status);
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/60 bg-muted/5 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-muted-foreground">{item.id.slice(0, 8)}…</p>
                          <p className="mt-1 font-medium">{item.customer}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.service}</p>
                          <p className="mt-2 text-sm tabular-nums">
                            {item.date} · {item.time}
                          </p>
                        </div>
                        <StatusBadge value={item.status} />
                      </div>
                      <div className="mt-3 flex justify-end">
                        <BookingActionsMenu
                          item={item}
                          locked={locked}
                          onDetail={setSelected}
                          onEdit={setEditing}
                          onReschedule={setRescheduleFor}
                          onAccept={(row) => bookingActions.updateStatus(row.id, "confirmed")}
                          onCancel={(row) => bookingActions.updateStatus(row.id, "cancelled")}
                          onNoShow={(row) => bookingActions.updateStatus(row.id, "no_show")}
                          onComplete={(row) => setCompleteFor(row)}
                          onDelete={setDeleteTarget}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-border/60 md:block">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {["Booking ID", "Customer", "Service", "Date", "Time", "Status", "Staff", "Actions"].map((h) => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const locked = BOOKING_TERMINAL_STATUSES.includes(item.status);
                    return (
                      <tr key={item.id} className="border-t border-border/50 transition hover:bg-muted/15">
                        <td className="px-3 py-3 font-mono text-xs">{item.id.slice(0, 8)}…</td>
                        <td className="px-3 py-3">{item.customer}</td>
                        <td className="px-3 py-3">{item.service}</td>
                        <td className="px-3 py-3 tabular-nums">{item.date}</td>
                        <td className="px-3 py-3 tabular-nums">{item.time}</td>
                        <td className="px-3 py-3">
                          <StatusBadge value={item.status} />
                        </td>
                        <td className="px-3 py-3">{item.staff}</td>
                        <td className="px-3 py-3">
                          <BookingActionsMenu
                            item={item}
                            locked={locked}
                            onDetail={setSelected}
                            onEdit={setEditing}
                            onReschedule={setRescheduleFor}
                            onAccept={(row) => bookingActions.updateStatus(row.id, "confirmed")}
                            onCancel={(row) => bookingActions.updateStatus(row.id, "cancelled")}
                            onNoShow={(row) => bookingActions.updateStatus(row.id, "no_show")}
                            onComplete={(row) => setCompleteFor(row)}
                            onDelete={setDeleteTarget}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      <ManagerDialog open={Boolean(selected)} onClose={() => setSelected(null)} title="Booking details">
        {selected ? (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/20 p-3 text-xs">
              <p>
                <span className="text-muted-foreground">ID:</span>{" "}
                <span className="font-mono">{selected.id}</span>
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Source:</span> {sourceLabel(selected.bookingSource)}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Status:</span> <StatusBadge value={selected.status} />
              </p>
              {selected.statusChangedAt ? (
                <p className="mt-1">
                  <span className="text-muted-foreground">Status last changed:</span> {formatTs(selected.statusChangedAt)}
                </p>
              ) : null}
            </div>
            <p>
              <span className="text-muted-foreground">Customer:</span> {selected.customer}
            </p>
            <p>
              <span className="text-muted-foreground">Service:</span> {selected.service}
            </p>
            <p>
              <span className="text-muted-foreground">Schedule:</span> {selected.date} · {selected.time}–{selected.endTime}
            </p>
            {selected.notes ? (
              <div className="rounded-md border border-muted p-2">
                <p className="text-xs font-medium text-muted-foreground">Customer note</p>
                <p className="mt-1 whitespace-pre-wrap">{selected.notes}</p>
              </div>
            ) : null}
            {selected.internalNote ? (
              <div className="rounded-md border border-dashed border-muted p-2">
                <p className="text-xs font-medium text-muted-foreground">Internal note</p>
                <p className="mt-1 whitespace-pre-wrap">{selected.internalNote}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </ManagerDialog>

      <ManagerDialog open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit booking">
        {editing ? (
          <form
            className="space-y-3 text-sm"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await bookingActions.save(editing);
              if (ok) setEditing(null);
            }}
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Customer</label>
              <Select
                value={editing.customerUserId || ""}
                onChange={(e) => {
                  const u = e.target.value;
                  const row = customers.find((c) => c.id === u);
                  setEditing({
                    ...editing,
                    customerUserId: u,
                    customer: row?.fullName || row?.email || editing.customer
                  });
                }}
              >
                {(customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || c.email || c.id}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Service</label>
              <Select
                value={editing.serviceId || ""}
                onChange={(e) => {
                  const sid = e.target.value;
                  const svc = services.find((s) => s.id === sid);
                  setEditing({
                    ...editing,
                    serviceId: sid,
                    service: svc?.name || editing.service
                  });
                }}
              >
                {(services || []).filter((s) => s.is_active !== false).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration} min)
                  </option>
                ))}
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              To change date or time, use <strong>Reschedule</strong> (keeps history). Editing date here also
              triggers reschedule when you save.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
              <Input type="time" value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} />
            </div>
            <Select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-show</option>
              <option value="rescheduled">Rescheduled</option>
            </Select>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Internal note</label>
              <NoteTextarea
                value={editing.internalNote ?? ""}
                onChange={(e) => setEditing({ ...editing, internalNote: e.target.value })}
                placeholder="Visible to your team only"
              />
            </div>
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Save
            </button>
          </form>
        ) : null}
      </ManagerDialog>

      <ManualBookingDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        customers={customers}
        services={services}
        onSave={(payload) => bookingActions.save(payload)}
      />

      <RescheduleBookingDialog
        open={Boolean(rescheduleFor)}
        onClose={() => setRescheduleFor(null)}
        booking={rescheduleFor}
        onReschedule={(id, payload) => bookingActions.reschedule(id, payload)}
      />

      <CompleteLessonDialog
        open={Boolean(completeFor)}
        onClose={() => setCompleteFor(null)}
        booking={completeFor}
        onSubmit={(id, payload) => bookingActions.completeLesson(id, payload)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete booking"
        description={`Delete booking ${deleteTarget?.id?.slice(0, 8)}…? This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) bookingActions.delete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
