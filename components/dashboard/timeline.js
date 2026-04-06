import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";

export function Timeline({ bookings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bookings.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">{booking.time} - {booking.customer}</p>
              <p className="text-xs text-muted-foreground">{booking.service}</p>
            </div>
            <StatusBadge value={booking.status} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
