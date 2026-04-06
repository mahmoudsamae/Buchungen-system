import { Topbar } from "@/components/navigation/topbar";
import { StatsCard } from "@/components/shared/stats-card";
import { ChartPlaceholder } from "@/components/shared/chart-placeholder";

const stats = [
  { label: "Total Businesses", value: "148", change: "+7 this month" },
  { label: "Active Businesses", value: "132", change: "89%" },
  { label: "Platform Bookings", value: "12,480", change: "+11%" },
  { label: "Suspended", value: "6", change: "-2" }
];

export default function AdminDashboardPage() {
  return (
    <>
      <Topbar title="Super Admin Dashboard" subtitle="Platform overview" />
      <main className="space-y-4 p-4 md:p-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => <StatsCard key={stat.label} {...stat} />)}
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          <ChartPlaceholder title="Business Growth" />
          <ChartPlaceholder title="Booking Volume Trend" />
        </section>
      </main>
    </>
  );
}
