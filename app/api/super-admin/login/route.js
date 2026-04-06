import { NextResponse } from "next/server";

/** @deprecated Use POST /api/super-admin/auth/login with platform admin Supabase credentials. */
export async function POST() {
  return NextResponse.json(
    { error: "Use Supabase super-admin email/password via /api/super-admin/auth/login." },
    { status: 410 }
  );
}
