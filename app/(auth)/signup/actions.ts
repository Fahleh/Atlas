"use server";

import { createClient } from "@/lib/supabase/server";
import {
  isValidEmail,
  isPasswordLongEnough,
  passwordsMatch,
  MIN_PASSWORD_LENGTH,
} from "@/lib/utils";

export type SignupFormState = {
  error: string | null;
  accountExists: boolean;
  success: boolean;
};

/**
 * Server Action for email/password account creation.
 * Conforms to the `useActionState` signature: `(prevState, formData) => newState`.
 * On success, returns `{ success: true }` — no redirect, as the session does not
 * exist until the user confirms their email.
 *
 * @param _prevState - Previous action state (unused; required by useActionState contract)
 * @param formData - Form data containing name, email, password, and confirmPassword
 * @returns SignupFormState — success flag and optional error string
 */
export async function signup(
  _prevState: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const name = formData.get("name") as string | null;
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  const confirmPassword = formData.get("confirmPassword") as string | null;

  if (!name?.trim() || !email?.trim() || !password || !confirmPassword) {
    return {
      error: "All fields are required.",
      accountExists: false,
      success: false,
    };
  }

  if (name.trim().length < 3) {
    return {
      error: "Name must be at least 3 characters long.",
      accountExists: false,
      success: false,
    };
  }

  if (name.trim().length > 100) {
    return {
      error: "Name must be at most 100 characters long.",
      accountExists: false,
      success: false,
    };
  }

  if (!isValidEmail(email)) {
    return {
      error: "Please enter a valid email address.",
      accountExists: false,
      success: false,
    };
  }

  if (!isPasswordLongEnough(password)) {
    return {
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      accountExists: false,
      success: false,
    };
  }

  if (!passwordsMatch(password, confirmPassword)) {
    return {
      error: "Passwords do not match.",
      accountExists: false,
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return {
        error:
          "An account with this email already exists. Try logging in instead.",
        accountExists: true,
        success: false,
      };
    }
    return {
      error: "Something went wrong. Please try again.",
      accountExists: false,
      success: false,
    };
  }

  return { error: null, accountExists: false, success: true };
}
