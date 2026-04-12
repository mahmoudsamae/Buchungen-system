import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { defaultSchoolSlugForLoginRedirects } from "@/lib/auth/default-school-slug";
import { platformAccessFromProfile } from "@/lib/platform/access";

export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  if (!url || !anon) {
    return response;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  /** Public tenant login entry — QR/link opens this page; credentials are always required. */
  if (
    pathname.startsWith("/login/school/") ||
    pathname.startsWith("/login/teacher/") ||
    pathname.startsWith("/login/student/")
  ) {
    return response;
  }

  /** Teacher workspace — active staff membership for this school only. */
  if (pathname.startsWith("/teacher/")) {
    const parts = pathname.split("/").filter(Boolean);
    const schoolSlug = parts[1];
    if (!schoolSlug) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (!user) {
      const login = new URL(`/login/teacher/${schoolSlug}`, request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    const { data: biz } = await supabase.from("businesses").select("id, slug").ilike("slug", schoolSlug).maybeSingle();
    if (!biz) {
      return NextResponse.redirect(new URL(`/login/teacher/${schoolSlug}?error=unknown_business`, request.url));
    }
    const { data: staff } = await supabase
      .from("business_users")
      .select("id")
      .eq("business_id", biz.id)
      .eq("user_id", user.id)
      .eq("role", "staff")
      .eq("status", "active")
      .maybeSingle();
    if (!staff) {
      return NextResponse.redirect(new URL(`/login/teacher/${biz.slug}?error=no_staff`, request.url));
    }
    return response;
  }

  const defaultSchoolLogin = `/login/school/${encodeURIComponent(defaultSchoolSlugForLoginRedirects())}`;

  if (pathname.startsWith("/manager") && pathname !== "/manager/login") {
    if (!user) {
      return NextResponse.redirect(new URL(defaultSchoolLogin, request.url));
    }
    const { data: membership } = await supabase
      .from("business_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "manager")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (!membership) {
      return NextResponse.redirect(new URL(`${defaultSchoolLogin}?error=no_manager`, request.url));
    }
  }

  if (pathname === "/manager/login") {
    return NextResponse.redirect(new URL(defaultSchoolLogin, request.url));
  }

  if (pathname.startsWith("/super-admin")) {
    if (!user) {
      const login = new URL("/internal/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("platform_role, is_platform_super_admin, platform_staff_suspended")
      .eq("id", user.id)
      .maybeSingle();
    const access = platformAccessFromProfile(profile);
    if (!access.canAccessPlatformAdmin) {
      return NextResponse.redirect(new URL("/internal/login?error=forbidden", request.url));
    }
    if (pathname.startsWith("/super-admin/owner") && !access.isPlatformOwner) {
      return NextResponse.redirect(new URL("/super-admin", request.url));
    }
  }

  async function guardCustomerPortal(portalPrefix) {
    const parts = pathname.split("/").filter(Boolean);
    const slug = parts[1];
    const segment = parts[2] || "";
    if (slug && segment !== "login") {
      if (!user) {
        const login = new URL(`${portalPrefix}/${slug}/login`, request.url);
        login.searchParams.set("next", pathname);
        return NextResponse.redirect(login);
      }
      const { data: biz } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
      if (!biz) {
        return NextResponse.redirect(new URL(`${portalPrefix}/${slug}/login?error=unknown_business`, request.url));
      }
      const { data: cust } = await supabase
        .from("business_users")
        .select("id")
        .eq("business_id", biz.id)
        .eq("user_id", user.id)
        .eq("role", "customer")
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (!cust) {
        return NextResponse.redirect(new URL(`${portalPrefix}/${slug}/login?error=not_a_customer`, request.url));
      }
    }
    return null;
  }

  if (pathname.startsWith("/portal/")) {
    const redir = await guardCustomerPortal("/portal");
    if (redir) return redir;
  }

  if (pathname.startsWith("/student/")) {
    const redir = await guardCustomerPortal("/student");
    if (redir) return redir;
  }

  return response;
}

export const config = {
  matcher: [
    "/manager/:path*",
    "/super-admin/:path*",
    "/portal/:path*",
    "/student/:path*",
    "/teacher/:path*",
    "/login/school/:path*",
    "/login/teacher/:path*",
    "/login/student/:path*"
  ]
};
