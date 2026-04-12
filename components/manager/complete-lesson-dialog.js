"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { ManagerDialog } from "@/components/manager/dialog";
import { Textarea } from "@/components/ui/textarea";

const emptyForm = {
  notes: "",
  topics: "",
  nextFocus: "",
  completedAt: "",
  visibleToStudent: false
};

export function CompleteLessonDialog({ open, booking, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setForm({ notes: "", topics: "", nextFocus: "", completedAt: `${y}-${m}-${d}T${h}:${mm}`, visibleToStudent: false });
    setError("");
    setSaving(false);
  }, [open, booking?.id]);

  return (
    <ManagerDialog open={open} onClose={onClose} title="Complete lesson and write report">
      {booking ? (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const notes = form.notes.trim();
            if (!notes) {
              setError("Lesson notes are required.");
              return;
            }
            setSaving(true);
            setError("");
            const ok = await onSubmit(booking.id, {
              notes,
              topics: form.topics,
              nextFocus: form.nextFocus,
              completed_at: form.completedAt ? new Date(form.completedAt).toISOString() : new Date().toISOString(),
              visible_to_student: Boolean(form.visibleToStudent)
            });
            setSaving(false);
            if (ok) onClose();
          }}
        >
          <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Student:</span> {booking.customer}
            </p>
            <p className="mt-1">
              <span className="font-medium text-foreground">Lesson:</span> {booking.date} · {booking.time}
              {booking.endTime ? `–${booking.endTime}` : ""}
            </p>
            <p className="mt-1">
              <span className="font-medium text-foreground">Service:</span> {booking.service}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Lesson notes *</label>
            <Textarea
              required
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="What was practiced, what improved, mistakes, route details…"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Topics covered (comma-separated)</label>
            <Input
              value={form.topics}
              onChange={(e) => setForm((f) => ({ ...f, topics: e.target.value }))}
              placeholder="Parken, Innenstadt, Abbiegen"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Next focus</label>
            <Input
              value={form.nextFocus}
              onChange={(e) => setForm((f) => ({ ...f, nextFocus: e.target.value }))}
              placeholder="What to focus in the next lesson"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Completed at</label>
            <Input
              type="datetime-local"
              value={form.completedAt}
              onChange={(e) => setForm((f) => ({ ...f, completedAt: e.target.value }))}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(form.visibleToStudent)}
              onChange={(e) => setForm((f) => ({ ...f, visibleToStudent: e.target.checked }))}
            />
            Visible to student
          </label>

          {error ? <p className="text-xs text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving report..." : "Complete lesson"}
          </button>
        </form>
      ) : null}
    </ManagerDialog>
  );
}
