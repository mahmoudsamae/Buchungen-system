import { NextResponse } from "next/server";
import { guardPlatformOwnerJson } from "@/lib/auth/guards";
import { setPlatformAdminSuspendedAdmin } from "@/lib/data/super-admin-platform-admins";

export async function PATCH(request, { params }) {
  const g = await guardPlatformOwnerJson();
  if (g.response) return g.response;

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.suspended !== "boolean") {
    return NextResponse.json({ error: "Field `suspended` (boolean) is required." }, { status: 400 });
  }

  try {
    const result = await setPlatformAdminSuspendedAdmin(userId, body.suspended, g.ctx.user.id);
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    const code = e.code === "NOT_FOUND" ? 404 : e.code === "VALIDATION" ? 400 : 400;
    return NextResponse.json({ error: e.message || "Update failed" }, { status: code });
  }
}
