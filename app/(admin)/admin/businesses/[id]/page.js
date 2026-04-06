import { notFound } from "next/navigation";
import { Topbar } from "@/components/navigation/topbar";
import { adminBusinesses } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";

export default function BusinessDetailPage({ params }) {
  const business = adminBusinesses.find((item) => item.id === params.id);
  if (!business) return notFound();

  return (
    <>
      <Topbar title={`Business: ${business.name}`} subtitle="Business detail and controls" />
      <main className="grid gap-4 p-4 md:p-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Owner:</span> {business.owner}</p>
            <p><span className="text-muted-foreground">Plan:</span> {business.plan}</p>
            <p><span className="text-muted-foreground">Bookings:</span> {business.bookings}</p>
            <p><span className="text-muted-foreground">Status:</span> <StatusBadge value={business.status} /></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Lifecycle Actions</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Button>Activate</Button>
            <Button variant="danger">Suspend</Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
