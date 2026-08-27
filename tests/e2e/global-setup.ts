/**
 * Playwright globalSetup: brings up the local Supabase stack, migrates it,
 * and seeds the fixed test accounts, all idempotent so repeated runs (local
 * or CI) never fail on "already exists" state. See docs/testing.md.
 */
import { execFileSync } from "node:child_process";
import { seedE2eAccounts } from "./seed";

// supabase start no-ops cleanly if the stack is already running, confirmed
// against the CLI's own already-running status branch before relying on it.
function supabaseCli(args: string[]): string {
  return execFileSync("npx", ["-y", "supabase@2.115.0", ...args], {
    encoding: "utf8",
  });
}

function parseEnvOutput(output: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of output.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)="(.*)"$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

export default async function globalSetup(): Promise<void> {
  supabaseCli(["start"]);
  supabaseCli(["db", "reset", "--local"]);

  const status = parseEnvOutput(supabaseCli(["status", "-o", "env"]));
  process.env.SUPABASE_URL = status.API_URL;
  process.env.SUPABASE_SECRET_KEY = status.SECRET_KEY;

  await seedE2eAccounts();
}
