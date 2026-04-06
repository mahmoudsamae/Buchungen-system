import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function ServiceCard({ service }) {
  return (
    <Card className="cursor-pointer transition hover:border-primary">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium">{service.name}</h3>
            <p className="text-sm text-muted-foreground">{service.duration} min</p>
          </div>
          <p className="text-sm font-medium">{formatCurrency(service.price)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
