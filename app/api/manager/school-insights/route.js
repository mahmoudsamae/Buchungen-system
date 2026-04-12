import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { getSchoolDashboardInsights } from "@/lib/data/school-dashboard-insights";

/** School-scoped analytics & operational signals (manager dashboard). */
export async function GET(request) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  try {
    const insights = await getSchoolDashboardInsights(g.ctx.business.id);
    return NextResponse.json(insights);
  } catch (e) {
    console.error("[school-insights]", e);
    return NextResponse.json({ error: e.message || "Failed to load insights" }, { status: 500 });
  }
}
