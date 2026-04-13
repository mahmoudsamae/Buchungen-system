import { NextResponse } from "next/server";
import { guardStaffJson } from "@/lib/auth/guards";
import { assertTeacherCapability } from "@/lib/auth/teacher-capabilities";
import { getTeacherAnalyticsPayload } from "@/lib/data/teacher-workspace";

export async function GET(request) {
  const g = await guardStaffJson(request);
  if (g.response) return g.response;
  const { business, user } = g.ctx;

  const cap = await assertTeacherCapability(business.id, user.id, "can_view_analytics");
  if (!cap.ok) return NextResponse.json({ error: cap.message }, { status: cap.status });

  try {
    const analytics = await getTeacherAnalyticsPayload(business.id, user.id);
    return NextResponse.json(analytics);
  } catch (e) {
    console.error("[teacher/analytics]", e);
    return NextResponse.json({ error: e.message || "Failed" }, { status: 500 });
  }
}
