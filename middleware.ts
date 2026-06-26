import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isAuthRoute = path === "/login";
  const isPublicAsset =
    path.startsWith("/_next") || path.startsWith("/favicon") || path === "/api/health";

  const url = SUPABASE_URL;
  const anon = SUPABASE_ANON_KEY;

  // If config is missing or auth lookup fails, never hard-500 — fall back to
  // sending the user to the login page (or letting public assets through).
  if (!url || !anon) {
    if (isAuthRoute || isPublicAsset) return response;
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    return NextResponse.redirect(login);
  }

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isAuthRoute && !isPublicAsset) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      return NextResponse.redirect(login);
    }

    if (user && isAuthRoute) {
      const dash = request.nextUrl.clone();
      dash.pathname = "/dashboard";
      return NextResponse.redirect(dash);
    }

    return response;
  } catch (err) {
    console.error("[middleware] auth check failed:", (err as Error)?.message);
    if (isAuthRoute || isPublicAsset) return response;
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
