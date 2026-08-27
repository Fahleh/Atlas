"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Signs the current user out of the active session and redirects to /login.
 * Uses local scope to sign out only this session, leaving other devices signed in.
 * signOut errors are intentionally discarded — proxy.ts enforces re-auth on
 * the next request regardless, so surfacing a logout error offers no recovery path.
 *
 * @returns never — redirect() always throws internally; this function never resolves normally
 */
export async function logout(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  redirect("/login");
}
