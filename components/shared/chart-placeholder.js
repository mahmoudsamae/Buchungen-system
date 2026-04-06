import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartPlaceholder({ title, subtitle = "Chart preview" }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 rounded-md border bg-muted/30 p-4">
          <div className="h-full w-full rounded bg-gradient-to-tr from-muted to-transparent" />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
