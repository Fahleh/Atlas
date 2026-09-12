"use server";

import { getBaseUrl } from "@/lib/baseUrl";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type LoginFormState = { error: string | null; email: string };

/**
 * Server Action for email/password sign-in.
 * Conforms to the `useActionState` signature: `(prevState, formData) => newState`.
 * On success, redirects. Never returns. On failure, returns an error state.
 *
 * React 19 clears every uncontrolled form field once the action's promise
 * settles, regardless of outcome, so email is returned here and read back
 * via `defaultValue` to survive an error. Password is never returned; it
 * clears on error by design.
 *
 * @param _prevState - Previous action state (unused; required by useActionState contract)
 * @param formData - Form data containing email, password, and optional redirectTo
 * @returns LoginFormState with a non-null error string on failure
 */
export async function login(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  const redirectTo = formData.get("redirectTo") as string | null;

  if (!email?.trim() || !password?.trim())
    return { error: "Email and password are required.", email: email ?? "" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Raised by reject_deleted_user_token (migration 019). Match on status
    // and message, not error.code, GoTrue doesn't map a custom hook's
    // returned error to a real code, it stays "unknown". Reuses the same
    // ?error=account_deleted messaging path DeletedAccountGuard's redirect
    // already renders on /login, not a second message for the same thing.
    if (error.status === 403 && error.message === "account_deleted") {
      redirect("/login?error=account_deleted");
    }
    if (error.code === "email_not_confirmed") {
      return {
        error: "Please confirm your email before signing in.",
        email,
      };
    }
    return { error: "Invalid email or password.", email };
  }

  const baseUrl = getBaseUrl();
  let destination = "/";

  try {
    const baseOrigin = new URL(baseUrl).origin;
    const url = new URL(redirectTo ?? "/", baseUrl);

    if (url.origin === baseOrigin) {
      destination = url.pathname + url.search + url.hash;
    }
  } catch {
    // Ignore invalid redirectTo values and default to /.
  }

  redirect(destination);
}
