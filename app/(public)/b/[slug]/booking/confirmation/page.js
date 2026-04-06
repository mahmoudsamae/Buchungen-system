import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BookingConfirmationPage() {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <Badge tone="success">Confirmed</Badge>
        <h1 className="text-2xl font-semibold">Booking confirmed</h1>
        <div className="rounded-md border p-4 text-sm">
          <p><span className="text-muted-foreground">Service:</span> Standard Session</p>
          <p><span className="text-muted-foreground">Date:</span> Apr 03, 2026</p>
          <p><span className="text-muted-foreground">Time:</span> 10:30</p>
          <p><span className="text-muted-foreground">Booking ID:</span> DM-1005</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customer/bookings" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Manage Booking
          </Link>
          <Link href="/" className="rounded-md border px-4 py-2 text-sm font-medium">
            Done
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
