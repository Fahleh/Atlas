/**
 * Idempotent E2E fixture seeding. Creates the three fixed test accounts
 * (tests/e2e/accounts.ts) against the local Supabase stack via the admin
 * API, pre-confirmed so E2E specs can log in immediately. Safe to run on
 * every globalSetup: a duplicate createUser call fails with the documented
 * `email_exists` error code, treated here as "already seeded," not a failure.
 *
 * Requires SUPABASE_URL and SUPABASE_SECRET_KEY in the environment (read
 * from `supabase status -o env` by globalSetup, not hardcoded).
 */
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";
import { PRIMARY_ACCOUNT, SECONDARY_ACCOUNT, RESET_ACCOUNT } from "./accounts";

// Node 20 has no native WebSocket; supabase-js's RealtimeClient constructor
// requires one even though this script never opens a realtime connection.
// Same fix as jest.setup.ts.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WebSocket as unknown as typeof globalThis.WebSocket;
}

export async function seedE2eAccounts(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "seedE2eAccounts requires SUPABASE_URL and SUPABASE_SECRET_KEY in the environment.",
    );
  }

  const admin = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  async function seedAccount(account: { email: string; password: string }) {
    const { error } = await admin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
    });
    if (error && error.code !== "email_exists") {
      throw error;
    }
  }

  await seedAccount(PRIMARY_ACCOUNT);
  await seedAccount(SECONDARY_ACCOUNT);
  await seedAccount(RESET_ACCOUNT);
}
