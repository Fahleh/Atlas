"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type LoginFormState = { error: string | null };

/**
 * Server Action for email/password sign-in.
 * Conforms to the `useActionState` signature: `(prevState, formData) => newState`.
 * On success, redirects. Never returns. On failure, returns an error state.
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
    return { error: "Email and password are required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Please confirm your email before signing in." };
    }
    return { error: "Invalid email or password." };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
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
