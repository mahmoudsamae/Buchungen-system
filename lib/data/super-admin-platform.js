import { createAdminClient } from "@/lib/supabase/admin";

export async function getPlatformSnapshotAdmin() {
  const admin = createAdminClient();
  const { data: businesses, error: be } = await admin.from("businesses").select("id, name, slug, status, created_at").order("created_at", { ascending: false });
  if (be) throw be;

  const list = businesses || [];
  const active = list.filter((b) => b.status === "active").length;
  const suspended = list.filter((b) => b.status === "suspended").length;
  const inactive = list.filter((b) => b.status === "inactive").length;

  const { count: profileCount } = await admin.from("profiles").select("*", { count: "exact", head: true });
  const { count: bookingCount } = await admin.from("bookings").select("*", { count: "exact", head: true });
  const { count: managerCount } = await admin
    .from("business_users")
    .select("*", { count: "exact", head: true })
    .eq("role", "manager");

  const recentBusinesses = [...list]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      status: b.status,
      createdAt: b.created_at?.slice(0, 10)
    }));

  return {
    totals: {
      businesses: list.length,
      active,
      inactive,
      suspended,
      bookings: bookingCount ?? 0,
      profiles: profileCount ?? 0,
      managers: managerCount ?? 0,
      users: profileCount ?? 0
    },
    recentBusinesses,
    recentActivity: []
  };
}
