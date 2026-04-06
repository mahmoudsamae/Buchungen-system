"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartPreview({ title, subtitle, points = [], emptyLabel = "No data for this period" }) {
  const safePoints = Array.isArray(points) ? points : [];
  const values = safePoints.map((p) => Number(p?.value) || 0);
  const max = Math.max(1, ...values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent>
        {safePoints.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          <div className="flex h-48 gap-2 rounded-md border bg-muted/20 p-3">
            {safePoints.map((point, i) => {
              const v = Number(point?.value) || 0;
              const pct = (v / max) * 100;
              return (
                <div key={`${String(point?.label)}-${i}`} className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
                  <div className="relative min-h-0 flex-1 w-full">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-sm bg-primary/75 transition hover:bg-primary"
                      style={{
                        height: `${pct}%`,
                        minHeight: v > 0 ? 4 : 0
                      }}
                    />
                  </div>
                  <p className="shrink-0 text-center text-[10px] text-muted-foreground">{point?.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
