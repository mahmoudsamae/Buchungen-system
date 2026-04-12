import { NextResponse } from "next/server";
import { getSessionUser, requireManagerContext, requireStaffContext } from "@/lib/auth/session";

/**
 * After Supabase `signInWithPassword`, verifies the session user belongs to the
 * requested tenant with the requested role. Client must call this before redirecting.
 */
export async function POST(request) {
  const session = await getSessionUser();
  if (!session.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = String(body.slug || "")
    .trim()
    .toLowerCase();
  const role = String(body.role || "").toLowerCase();

  if (!slug || (role !== "manager" && role !== "staff")) {
    return NextResponse.json({ error: "slug and role (manager|staff) required" }, { status: 400 });
  }

  if (role === "manager") {
    const ctx = await requireManagerContext({ slug, cachedSession: session });
    if (!ctx) {
      return NextResponse.json({ error: "No active school administrator membership for this account." }, { status: 403 });
    }
    return NextResponse.json({
      ok: true,
      redirect: `/manager/${ctx.business.slug}/dashboard`
    });
  }

  const ctx = await requireStaffContext({ slug, cachedSession: session });
  if (!ctx) {
    return NextResponse.json({ error: "No active teacher membership for this school." }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    redirect: `/teacher/${ctx.business.slug}/dashboard`
  });
}
