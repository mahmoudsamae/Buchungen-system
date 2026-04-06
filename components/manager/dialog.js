"use client";

import { Card } from "@/components/ui/card";

export function ManagerDialog({ open, title, children, onClose, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4">
      <Card className={`w-full rounded-xl p-5 shadow-card ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
            Close
          </button>
        </div>
        {children}
      </Card>
    </div>
  );
}

export function ConfirmDialog({ open, title, description, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/45 p-4">
      <Card className="w-full max-w-md rounded-xl p-5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white">
            Confirm
          </button>
        </div>
      </Card>
    </div>
  );
}
