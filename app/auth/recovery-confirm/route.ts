import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /auth/recovery-confirm
 *
 * Exchanges a `token_hash` from a Supabase password-recovery email for a
 * session. Supabase's recovery email template is set to:
 *   {{ .SiteURL }}/auth/recovery-confirm?token_hash={{ .TokenHash }}&type=recovery
 *
 * On success, redirects to /update-password, now authenticated. On missing
 * params or verification error, redirects to
 * /reset-password?error=recovery_failed. See app/auth/confirm/route.ts for
 * the equivalent signup flow, and docs/decisions.md for why these stay
 * separate handlers.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!token_hash || type !== "recovery") {
    return NextResponse.redirect(
      new URL("/reset-password?error=recovery_failed", request.url),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: "recovery" as EmailOtpType,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/reset-password?error=recovery_failed", request.url),
    );
  }

  return NextResponse.redirect(new URL("/update-password", request.url));
}
