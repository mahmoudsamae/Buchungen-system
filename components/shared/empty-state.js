import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function EmptyState({ title, description, ctaLabel = "Create", onClick }) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <Button className="mt-4" onClick={onClick}>
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
