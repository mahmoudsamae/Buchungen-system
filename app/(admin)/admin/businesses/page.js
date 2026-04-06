import Link from "next/link";
import { Topbar } from "@/components/navigation/topbar";
import { adminBusinesses } from "@/lib/mock-data";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";

const columns = ["name", "owner", "plan", "status", "bookings", "lastActive", "actions"];

export default function BusinessesPage() {
  return (
    <>
      <Topbar title="Businesses" subtitle="Manage all tenant businesses" />
      <main className="p-4 md:p-6">
        <Card>
          <CardContent className="p-4">
            <DataTable
              columns={columns}
              rows={adminBusinesses}
              renderCell={(row, column) => {
                if (column === "status") return <StatusBadge value={row.status} />;
                if (column === "actions") return <Link href={`/admin/businesses/${row.id}`} className="text-primary">View</Link>;
                return row[column];
              }}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
