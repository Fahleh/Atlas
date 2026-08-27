import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /auth/confirm
 *
 * Exchanges a `token_hash` from a Supabase confirmation email for a session.
 * Supabase sets the email template to:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
 *
 * On success, redirects to /.
 * On missing params or verification error, redirects to /login?error=confirmation_failed.
 * 
 * All failure modes (missing params, invalid token, expired token) currently
 * collapse to the same generic error redirect. Acceptable for portfolio scope;
 * would be worth distinguishing "expired" once a resend-confirmation flow exists.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!token_hash || type !== "email") {
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: "email" as EmailOtpType,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", request.url),
    );
  }

  return NextResponse.redirect(new URL("/", request.url));
}
