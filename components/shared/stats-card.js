import { Card, CardContent } from "@/components/ui/card";

export function StatsCard({ label, value, change }) {
  return (
    <Card className="overflow-hidden ring-1 ring-border/40">
      <CardContent className="p-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-3 flex items-end justify-between gap-2">
          <p className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">{value}</p>
          <p className="max-w-[45%] text-right text-[11px] leading-tight text-muted-foreground">{change}</p>
        </div>
      </CardContent>
    </Card>
  );
}
