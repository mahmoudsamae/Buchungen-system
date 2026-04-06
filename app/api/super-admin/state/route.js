import { NextResponse } from "next/server";
import { guardSuperAdminJson } from "@/lib/auth/guards";
import { getPlatformSnapshotAdmin } from "@/lib/data/super-admin-platform";

export async function GET() {
  const g = await guardSuperAdminJson();
  if (g.response) return g.response;
  try {
    const snapshot = await getPlatformSnapshotAdmin();
    return NextResponse.json(snapshot);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
