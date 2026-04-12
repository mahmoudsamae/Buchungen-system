import { NextResponse } from "next/server";
import { guardManagerJson } from "@/lib/auth/guards";
import { getSchoolTeacherDetail } from "@/lib/data/school-dashboard-insights";

export async function GET(request, { params }) {
  const g = await guardManagerJson(request);
  if (g.response) return g.response;
  const { userId } = await params;
  try {
    const detail = await getSchoolTeacherDetail(g.ctx.business.id, userId);
    if (!detail) {
      return NextResponse.json({ error: "Teacher not found in this school." }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (e) {
    console.error("[teachers/detail]", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
