import { NextResponse } from "next/server";
import { getSessionUser, requireManagerContext, requireStaffContext, requireSuperAdmin } from "@/lib/auth/session";
import { MANAGER_BUSINESS_SLUG_HEADER } from "@/lib/manager/api-constants";

/**
 * @param {Request | null | undefined} [request] When provided, `x-bookflow-business-slug` selects the manager business.
 */
export async function guardManagerJson(request) {
  const session = await getSessionUser();
  if (!session.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const slug =
    request && typeof request.headers?.get === "function"
      ? request.headers.get(MANAGER_BUSINESS_SLUG_HEADER) || request.headers.get("X-Bookflow-Business-Slug")
      : null;

  const ctx = await requireManagerContext({ slug: slug || undefined, cachedSession: session });
  if (!ctx) {
    if (slug) {
      return { response: NextResponse.json({ error: "Forbidden for this business." }, { status: 403 }) };
    }
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx };
}

/**
 * Teacher (staff) APIs for a business — requires `x-bookflow-business-slug`.
 */
export async function guardStaffJson(request) {
  const session = await getSessionUser();
  if (!session.user) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const slug =
    request && typeof request.headers?.get === "function"
      ? request.headers.get(MANAGER_BUSINESS_SLUG_HEADER) || request.headers.get("X-Bookflow-Business-Slug")
      : null;

  const ctx = await requireStaffContext({ slug: slug || undefined, cachedSession: session });
  if (!ctx) {
    if (slug) {
      return { response: NextResponse.json({ error: "Forbidden for this business." }, { status: 403 }) };
    }
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ctx };
}

/** Any active platform staff (owner or platform_admin / legacy). */
export async function guardSuperAdminJson() {
  const ctx = await requireSuperAdmin();
  if (!ctx) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { ctx };
}

/** Mutations reserved for platform_owner. */
export async function guardPlatformOwnerJson() {
  const ctx = await requireSuperAdmin();
  if (!ctx) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!ctx.platformAccess?.isPlatformOwner) {
    return { response: NextResponse.json({ error: "Platform owner only." }, { status: 403 }) };
  }
  return { ctx };
}
