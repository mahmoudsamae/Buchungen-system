import { Topbar } from "@/components/navigation/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  return (
    <>
      <Topbar title="Admin Settings" subtitle="Platform control settings" />
      <main className="grid gap-4 p-4 md:p-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Platform Defaults</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input defaultValue="Default timezone: UTC" />
            <Input defaultValue="Business creation: manual approval" />
            <Button>Save defaults</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Admin Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input defaultValue="Activity retention: 180 days" />
            <Input defaultValue="Critical alerts: email enabled" />
            <Button>Save preferences</Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
