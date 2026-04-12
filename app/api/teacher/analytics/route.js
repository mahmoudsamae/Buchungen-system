import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { getTeacherAnalyticsPayload } from "@/lib/data/teacher-workspace";

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;
  try {
    const analytics = await getTeacherAnalyticsPayload(business.id, user.id);
    return NextResponse.json(analytics);
  } catch (e) {
    console.error("[teacher/analytics]", e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
