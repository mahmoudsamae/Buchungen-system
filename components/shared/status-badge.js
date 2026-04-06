import { Badge } from "@/components/ui/badge";

const tones = {
  confirmed: "success",
  pending: "warning",
  cancelled: "danger",
  completed: "info",
  no_show: "danger",
  rescheduled: "warning",
  "no-show": "danger",
  active: "success",
  inactive: "warning",
  suspended: "danger",
  manager: "info",
  staff: "default",
  customer: "default"
};

/** Human-readable label for booking statuses (snake_case in DB). */
const bookingLabels = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  rescheduled: "Rescheduled"
};

export function formatBookingStatus(value) {
  const key = String(value);
  return bookingLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ value }) {
  const raw = String(value);
  const normalized = raw.toLowerCase().replace(/\s+/g, "_");
  const toneKey = normalized === "no-show" ? "no_show" : normalized;
  const display =
    bookingLabels[raw] || bookingLabels[toneKey] || raw;
  return <Badge tone={tones[toneKey] || tones[normalized] || "default"}>{display}</Badge>;
}
