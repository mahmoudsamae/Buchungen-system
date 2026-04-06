import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function Modal({ title, description, confirmLabel = "Confirm", cancelLabel = "Cancel" }) {
  return (
    <div className="fixed inset-0 z-50 hidden items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline">{cancelLabel}</Button>
            <Button>{confirmLabel}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
