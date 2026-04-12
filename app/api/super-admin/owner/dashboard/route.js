import { NextResponse } from "next/server";
import { guardPlatformOwnerJson } from "@/lib/auth/guards";
import { getPlatformOwnerDashboardData } from "@/lib/data/platform-owner-dashboard";

/** Aggregated metrics & chart series for the platform owner command center. */
export async function GET(request) {
  const g = await guardPlatformOwnerJson();
  if (g.response) return g.response;
  try {
    const { searchParams } = new URL(request.url);
    const chartDays = parseInt(searchParams.get("days") || "30", 10);
    const data = await getPlatformOwnerDashboardData({ chartDays: Number.isFinite(chartDays) ? chartDays : 30 });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[owner/dashboard]", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
