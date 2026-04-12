import { createAdminClient } from "@/lib/supabase/admin";

function startOfMonth(d) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(today);
    t.setDate(today.getDate() - i);
    out.push(isoDate(t));
  }
  return out;
}

/**
 * Full platform owner dashboard payload — uses service role.
 * Billing tables are optional until migration `20260411120000_platform_owner_billing` is applied.
 * @param {{ chartDays?: number }} [opts]
 */
export async function getPlatformOwnerDashboardData(opts = {}) {
  const chartDays = Math.min(365, Math.max(7, Number(opts.chartDays) || 30));
  const admin = createAdminClient();

  const { data: businesses, error: be } = await admin.from("businesses").select("id, name, slug, status, created_at");
  if (be) throw be;
  const bizList = businesses || [];
  const now = new Date();
  const monthStart = startOfMonth(now);
  const newSchoolsThisMonth = bizList.filter((b) => b.created_at && new Date(b.created_at) >= monthStart).length;

  const { count: bookingTotal } = await admin.from("bookings").select("*", { count: "exact", head: true });

  const { data: buRows } = await admin.from("business_users").select("role, business_id");
  let teachers = 0;
  let students = 0;
  for (const r of buRows || []) {
    if (r.role === "staff") teachers += 1;
    if (r.role === "customer") students += 1;
  }

  /** @type {{ available: boolean, mrrCents: number, activeSubscriptions: number, pastDue: number, byPlan: Record<string, number>, totalRevenueCents: number, payingSchools: number }} */
  let billing = {
    available: false,
    mrrCents: 0,
    activeSubscriptions: 0,
    pastDue: 0,
    byPlan: { free: 0, basic: 0, pro: 0 },
    totalRevenueCents: 0,
    payingSchools: 0
  };

  let revenueByDay = [];
  let topSchoolsByRevenue = [];

  try {
    const { data: subs, error: se } = await admin.from("business_subscriptions").select("business_id, plan_code, status, price_cents");
    if (!se && subs) {
      billing.available = true;
      for (const s of subs) {
        if (s.status === "active" || s.status === "trialing") {
          billing.activeSubscriptions += 1;
          if (s.status === "active" && s.price_cents > 0) {
            billing.mrrCents += s.price_cents;
            billing.payingSchools += 1;
          }
        }
        if (s.status === "past_due") billing.pastDue += 1;
        const p = ["free", "basic", "pro"].includes(s.plan_code) ? s.plan_code : "free";
        billing.byPlan[p] = (billing.byPlan[p] || 0) + 1;
      }
    }

    const { data: revAgg } = await admin.from("platform_revenue_events").select("amount_cents");
    if (revAgg) {
      billing.totalRevenueCents = revAgg.reduce((a, r) => a + (r.amount_cents || 0), 0);
    }

    const revLookback = new Date();
    revLookback.setDate(revLookback.getDate() - (chartDays - 1));
    revLookback.setHours(0, 0, 0, 0);
    const { data: revDaily } = await admin
      .from("platform_revenue_events")
      .select("amount_cents, occurred_at")
      .gte("occurred_at", revLookback.toISOString());

    const byDay = {};
    for (const d of lastNDays(chartDays)) byDay[d] = 0;
    for (const row of revDaily || []) {
      const d = String(row.occurred_at).slice(0, 10);
      if (byDay[d] !== undefined) byDay[d] += row.amount_cents || 0;
    }
    revenueByDay = lastNDays(chartDays).map((date) => ({ date, amountCents: byDay[date] || 0 }));

    const { data: revByBiz } = await admin
      .from("platform_revenue_events")
      .select("business_id, amount_cents");
    const sumByBiz = {};
    for (const r of revByBiz || []) {
      if (!r.business_id) continue;
      sumByBiz[r.business_id] = (sumByBiz[r.business_id] || 0) + (r.amount_cents || 0);
    }
    topSchoolsByRevenue = Object.entries(sumByBiz)
      .map(([businessId, cents]) => ({ businessId, cents }))
      .sort((a, b) => b.cents - a.cents)
      .slice(0, 8);
  } catch {
    billing.available = false;
  }

  const nameById = Object.fromEntries(bizList.map((b) => [b.id, b.name]));
  topSchoolsByRevenue = topSchoolsByRevenue.map((r) => ({
    ...r,
    name: nameById[r.businessId] || "Unknown"
  }));

  const { data: allBookings } = await admin.from("bookings").select("booking_date, business_id");
  const dayKeys = lastNDays(chartDays);
  const bookingsPerDay = {};
  for (const d of dayKeys) bookingsPerDay[d] = 0;
  for (const b of allBookings || []) {
    const d = String(b.booking_date).slice(0, 10);
    if (bookingsPerDay[d] !== undefined) bookingsPerDay[d] += 1;
  }
  const dailyBookingsSeries = dayKeys.map((date) => ({ date, count: bookingsPerDay[date] || 0 }));

  const bookingsByBusiness = {};
  for (const b of allBookings || []) {
    bookingsByBusiness[b.business_id] = (bookingsByBusiness[b.business_id] || 0) + 1;
  }
  const schoolCount = bizList.length || 1;
  const avgBookingsPerSchool = (bookingTotal || 0) / schoolCount;

  const weekStart = startOfWeekMonday(now);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  let bookingsThisWeek = 0;
  let bookingsPrevWeek = 0;
  for (const b of allBookings || []) {
    const t = new Date(b.booking_date);
    if (t >= weekStart) bookingsThisWeek += 1;
    else if (t >= prevWeekStart && t < weekStart) bookingsPrevWeek += 1;
  }
  const weeklyGrowthPct =
    bookingsPrevWeek === 0 ? (bookingsThisWeek > 0 ? 100 : 0) : Math.round(((bookingsThisWeek - bookingsPrevWeek) / bookingsPrevWeek) * 100);

  const topSchoolsByBookings = Object.entries(bookingsByBusiness)
    .map(([businessId, count]) => ({
      businessId,
      name: nameById[businessId] || "Unknown",
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const arpuCents =
    students > 0 && billing.totalRevenueCents > 0 ? Math.round(billing.totalRevenueCents / students) : 0;

  const activity = [];
  const recentBiz = [...bizList]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
  for (const b of recentBiz) {
    activity.push({
      id: `biz-${b.id}`,
      type: "school_created",
      message: `School “${b.name}” created`,
      at: b.created_at
    });
  }

  const { data: recentBookings } = await admin
    .from("bookings")
    .select("id, booking_date, business_id")
    .order("booking_date", { ascending: false })
    .limit(8);
  for (const bk of recentBookings || []) {
    activity.push({
      id: `book-${bk.id}`,
      type: "booking_created",
      message: `Booking scheduled · ${nameById[bk.business_id] || "School"}`,
      at: bk.booking_date
    });
  }
  activity.sort((a, b) => new Date(b.at) - new Date(a.at));
  const recentActivity = activity.slice(0, 12);

  return {
    generatedAt: now.toISOString(),
    kpis: {
      totalSchools: bizList.length,
      teachers,
      students,
      totalBookings: bookingTotal ?? 0,
      totalRevenueEuros: (billing.totalRevenueCents / 100).toFixed(2),
      mrrEuros: (billing.mrrCents / 100).toFixed(2),
      activeSubscriptions: billing.activeSubscriptions,
      newSchoolsThisMonth,
      pastDueSubscriptions: billing.pastDue,
      avgBookingsPerSchool: avgBookingsPerSchool.toFixed(1),
      weeklyGrowthPct,
      arpuEuros: (arpuCents / 100).toFixed(2),
      payingSchools: billing.payingSchools,
      churnRatePct: null,
      conversionRatePct: null
    },
    billing,
    charts: {
      chartDays,
      dailyBookings: dailyBookingsSeries,
      revenueByDay,
      tenantStatus: {
        active: bizList.filter((b) => b.status === "active").length,
        inactive: bizList.filter((b) => b.status === "inactive").length,
        suspended: bizList.filter((b) => b.status === "suspended").length
      }
    },
    leaders: {
      topSchoolsByBookings,
      topSchoolsByRevenue
    },
    recentActivity
  };
}
