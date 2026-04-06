import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CustomerProfilePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input defaultValue="Liam Carter" />
        <Input defaultValue="liam@mail.com" />
        <Input defaultValue="+1 555-1010" />
        <Button>Save changes</Button>
      </CardContent>
    </Card>
  );
}
