import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { getTeacherOverviewPayload } from "@/lib/data/teacher-workspace";

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;
  try {
    const overview = await getTeacherOverviewPayload(business.id, user.id, business.timezone);
    return NextResponse.json(overview);
  } catch (e) {
    console.error("[teacher/overview]", e);
    if (e.code === "42P01" || String(e.message || "").includes("does not exist")) {
      return NextResponse.json(
        { error: "Teacher availability tables missing — run latest database migrations." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: e.message || "Failed to load overview" }, { status: 500 });
  }
}
