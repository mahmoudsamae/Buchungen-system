import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

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

  if (pathname.startsWith("/manager") && pathname !== "/manager/login") {
    if (!user) {
      return NextResponse.redirect(new URL("/business/login", request.url));
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
      return NextResponse.redirect(new URL("/business/login?error=no_manager", request.url));
    }
  }

  if (pathname === "/manager/login") {
    return NextResponse.redirect(new URL("/business/login", request.url));
  }

  if (pathname.startsWith("/super-admin")) {
    if (!user) {
      const login = new URL("/super-admin-login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_platform_super_admin")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile?.is_platform_super_admin) {
      return NextResponse.redirect(new URL("/super-admin-login?error=forbidden", request.url));
    }
  }

  if (pathname.startsWith("/portal/")) {
    const parts = pathname.split("/").filter(Boolean);
    const slug = parts[1];
    const segment = parts[2] || "";
    if (slug && segment !== "login") {
      if (!user) {
        const login = new URL(`/portal/${slug}/login`, request.url);
        login.searchParams.set("next", pathname);
        return NextResponse.redirect(login);
      }
      const { data: biz } = await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle();
      if (!biz) {
        return NextResponse.redirect(new URL(`/portal/${slug}/login?error=unknown_business`, request.url));
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
        return NextResponse.redirect(new URL(`/portal/${slug}/login?error=not_a_customer`, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/manager/:path*", "/super-admin/:path*", "/portal/:path*"]
};
