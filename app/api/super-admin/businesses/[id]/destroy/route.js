import { NextResponse } from "next/server";
import { guardSuperAdminJson } from "@/lib/auth/guards";
import { deleteBusinessAdmin, getBusinessDetailAdmin } from "@/lib/data/super-admin-businesses";

export async function POST(request, { params }) {
  const g = await guardSuperAdminJson();
  if (g.response) return g.response;

  const secret = process.env.SUPER_ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Set SUPER_ADMIN_SECRET for destructive confirmations." }, { status: 503 });
  }

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const business = await getBusinessDetailAdmin(id);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nameMatch = String(body.businessNameConfirm || "").trim() === business.name;
  const typedDelete = String(body.confirmPhrase || "").trim() === "DELETE";
  const secretOk = String(body.adminSecret || "") === secret;

  if (!nameMatch || !typedDelete || !secretOk) {
    return NextResponse.json(
      { error: "Confirmation failed. Type DELETE, exact business name, and Super Admin secret." },
      { status: 400 }
    );
  }

  try {
    await deleteBusinessAdmin(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: 500 });
  }
}
