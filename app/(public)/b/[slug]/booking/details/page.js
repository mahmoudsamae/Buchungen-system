import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function CustomerDetailsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Your details</h1>
      <Card>
        <CardContent className="space-y-3 p-4">
          <Select defaultValue="guest">
            <option value="guest">Book as guest</option>
            <option value="account">Sign in / create account</option>
          </Select>
          <Input placeholder="Full name" />
          <Input placeholder="Email address" />
          <Input placeholder="Phone number" />
          <Input placeholder="Optional notes" />
        </CardContent>
      </Card>
      <Link href="../confirmation" className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Confirm Booking
      </Link>
    </div>
  );
}
