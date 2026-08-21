"use server";

import { createClient } from "@/lib/supabase/server";
import { isValidEmail } from "@/lib/utils";

export type RequestPasswordResetFormState = {
  error: string | null;
  success: boolean;
};

/**
 * Server Action for requesting a password reset email.
 * Conforms to the `useActionState` signature: `(prevState, formData) => newState`.
 * Always returns the same success state regardless of whether the address
 * belongs to a real account. Supabase's `resetPasswordForEmail()` itself
 * never reveals account existence (it responds identically either way), and
 * this action must not reintroduce that leak by branching on its result.
 *
 * @param _prevState - Previous action state (unused; required by useActionState contract)
 * @param formData - Form data containing email
 * @returns RequestPasswordResetFormState — success flag and optional error string
 */
export async function requestPasswordReset(
  _prevState: RequestPasswordResetFormState,
  formData: FormData,
): Promise<RequestPasswordResetFormState> {
  const email = formData.get("email") as string | null;

  if (!email?.trim() || !isValidEmail(email)) {
    return { error: "Please enter a valid email address.", success: false };
  }

  const supabase = await createClient();

  // Result intentionally discarded: Supabase never reports whether the
  // email matched a real account, and this action must not either.
  await supabase.auth.resetPasswordForEmail(email);

  return { error: null, success: true };
}
