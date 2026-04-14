"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ManagerDialog({ open, title, children, onClose, wide, flush, hideTitle, cardClassName }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px] sm:p-6">
      <Card
        className={cn(
          "scrollbar-premium max-h-[min(88vh,860px)] w-full overflow-y-auto rounded-2xl border border-border/50 bg-card shadow-[0_0_0_1px_hsl(var(--border)/0.5),0_24px_80px_rgba(0,0,0,0.45)]",
          wide ? "max-w-3xl" : "max-w-lg",
          flush ? "p-0" : "p-5",
          cardClassName
        )}
      >
        <div
          className={cn(
            "flex items-center gap-3 border-b border-border/40 bg-card/90 px-5 py-3 backdrop-blur-sm",
            hideTitle ? "sticky top-0 z-[1] justify-end" : "justify-between"
          )}
        >
          {!hideTitle && title ? <h3 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">{title}</h3> : null}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-border hover:bg-muted/50 hover:text-foreground"
          >
            Close
          </button>
        </div>
        {!flush ? <div className="pt-4">{children}</div> : children}
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
