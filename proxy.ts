import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "./types/database.types";

const PUBLIC_PATHS = ["/login", "/signup", "/auth"];

function isPublicRoute(pathname: string) {
  return PUBLIC_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

const AUTH_ENTRY_PATHS = ["/login", "/signup"];

function isAuthEntryRoute(pathname: string) {
  return AUTH_ENTRY_PATHS.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => {
          return request.cookies.getAll();
        },
        setAll: (cookiesToSet, headers) => {
          // Update the income request cookies
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          // Rebuild response with the updated request
          response = NextResponse.next({ request });

          // Write cookies to the outgoing response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          // Write headers to the outgoing response
          Object.entries(headers ?? {}).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getClaims();

  const { pathname } = request.nextUrl;

  const isAuthenticated = !error && !!data?.claims;

  // If user is not authenticated, redirect to login
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname + request.nextUrl.search);

    return NextResponse.redirect(loginUrl);
  }

  // If an already-authenticated user lands on /login or /signup, send them
  // to the dashboard instead — closes the entry point where a still-logged-in
  // user could reach the login form and a different user could sign in from
  // the same tab, producing an ambiguous auth state before any cache-clearing
  // logic ever gets a chance to run. Scoped to /login and /signup only —
  // /auth/confirm must stay reachable regardless of auth state.
  if (isAuthenticated && isAuthEntryRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // User is authenticated (or route is public), continue to requested page
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Include more paths or patterns.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
