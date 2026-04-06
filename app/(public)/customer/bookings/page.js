import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bookings } from "@/lib/mock-data";
import { StatusBadge } from "@/components/shared/status-badge";

export default function MyBookingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Bookings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bookings.map((booking) => (
          <div key={booking.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{booking.service}</p>
              <StatusBadge value={booking.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {booking.date} at {booking.time}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
