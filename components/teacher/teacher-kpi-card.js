import { cn } from "@/lib/utils";

export function TeacherKpiCard({ label, value, hint, className }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/50 bg-gradient-to-br from-zinc-900/90 to-zinc-950/95 p-4 shadow-lg shadow-black/20",
        className
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
