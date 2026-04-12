import { cn } from "@/lib/utils";

/**
 * Premium KPI tile for school / manager dashboards.
 */
export function SchoolKpiCard({ label, value, hint, trend, className }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/50 bg-card/90 p-5 shadow-soft ring-1 ring-border/25 transition hover:border-border hover:shadow-card",
        className
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-3 break-words text-2xl font-semibold tabular-nums tracking-tight text-foreground md:text-[1.65rem] leading-none">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      {trend != null && trend !== "" ? (
        <p className="mt-2 text-[11px] font-medium text-primary/90">{trend}</p>
      ) : null}
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-primary/15 to-transparent blur-2xl" />
    </div>
  );
}
