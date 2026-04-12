import { Badge } from "@/components/ui/badge";
import { normalizeBookingStatus } from "@/lib/manager/booking-constants";

const tones = {
  confirmed: "success",
  pending: "warning",
  rejected: "danger",
  cancelled_by_user: "danger",
  cancelled_by_manager: "danger",
  completed: "info",
  no_show: "danger",
  expired: "warning",
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
  rejected: "Rejected",
  cancelled_by_user: "Cancelled by user",
  cancelled_by_manager: "Cancelled by manager",
  completed: "Completed",
  no_show: "No-show",
  expired: "Expired"
};

export function formatBookingStatus(value) {
  const key = normalizeBookingStatus(value) || String(value);
  return bookingLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ value }) {
  if (value === undefined || value === null || value === "") {
    return <Badge tone="default">—</Badge>;
  }
  const raw = String(value);
  if (raw === "undefined") {
    return <Badge tone="default">—</Badge>;
  }
  const normalized = normalizeBookingStatus(raw) || raw.toLowerCase().replace(/\s+/g, "_");
  const toneKey = normalized === "no-show" ? "no_show" : normalized;
  const display =
    bookingLabels[raw] || bookingLabels[toneKey] || raw;
  return <Badge tone={tones[toneKey] || tones[normalized] || "default"}>{display}</Badge>;
}
