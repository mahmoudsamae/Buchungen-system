import { Topbar } from "@/components/navigation/topbar";
import { activityLog } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ActivityPage() {
  return (
    <>
      <Topbar title="Platform Activity" subtitle="Latest platform events" />
      <main className="p-4 md:p-6">
        <Card>
          <CardHeader><CardTitle>Activity Stream</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {activityLog.map((item) => (
              <div key={item.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{item.event}</p>
                <p className="text-muted-foreground">{item.target} - {item.actor}</p>
                <p className="text-xs text-muted-foreground">{item.at}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
