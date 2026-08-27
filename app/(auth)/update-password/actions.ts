"use server";

import { createClient } from "@/lib/supabase/server";
import {
  isPasswordLongEnough,
  passwordsMatch,
  MIN_PASSWORD_LENGTH,
} from "@/lib/utils";
import { isAuthSessionMissingError } from "@supabase/supabase-js";

export type UpdatePasswordFormState = {
  error: string | null;
  sessionExpired: boolean;
  success: boolean;
};

/**
 * Server Action for setting a new password. Used both after a password
 * recovery link and from the in-app "Change password" link in ProfileForm.
 * Conforms to the `useActionState` signature: `(prevState, formData) => newState`.
 * Requires an authenticated session — `updateUser()` throws
 * `AuthSessionMissingError` without one, which is what keeps this action
 * from being reachable without a valid recovery link or an existing login.
 * That specific failure is surfaced via `sessionExpired`, distinct from any
 * other write failure, so the page can point the user back to
 * `/reset-password` instead of a generic retry message.
 *
 * @param _prevState - Previous action state (unused; required by useActionState contract)
 * @param formData - Form data containing password and confirmPassword
 * @returns UpdatePasswordFormState — success flag, sessionExpired flag, and optional error string
 */
export async function updatePassword(
  _prevState: UpdatePasswordFormState,
  formData: FormData,
): Promise<UpdatePasswordFormState> {
  const password = formData.get("password") as string | null;
  const confirmPassword = formData.get("confirmPassword") as string | null;

  if (!password || !confirmPassword) {
    return {
      error: "Both fields are required.",
      sessionExpired: false,
      success: false,
    };
  }

  if (!isPasswordLongEnough(password)) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      sessionExpired: false,
      success: false,
    };
  }

  if (!passwordsMatch(password, confirmPassword)) {
    return {
      error: "Passwords do not match.",
      sessionExpired: false,
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (isAuthSessionMissingError(error)) {
      return {
        error: "Your session has expired.",
        sessionExpired: true,
        success: false,
      };
    }
    return {
      error: "Something went wrong. Please try again.",
      sessionExpired: false,
      success: false,
    };
  }

  return { error: null, sessionExpired: false, success: true };
}
