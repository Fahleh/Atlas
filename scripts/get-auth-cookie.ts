/**
 * Standalone script, not part of the shipped app. Logs into Atlas with a
 * real Playwright browser and writes an authenticated cookie string to
 * .lighthouse-auth-cookie, for use with `lighthouse --extra-headers`.
 *
 * Replaces manual DevTools copy-paste: context.cookies() captures every
 * cookie the browser actually holds post-login, including HttpOnly ones and
 * any cookie chunked across sb-<ref>-auth-token.0/.1/.2, which a raw
 * document.cookie read or a single manually-copied cookie value would miss.
 *
 * Usage: npx tsx scripts/get-auth-cookie.ts
 * Requires LIGHTHOUSE_AUTH_EMAIL and LIGHTHOUSE_AUTH_PASSWORD in .env.local.
 */
import { config } from "dotenv";
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import path from "node:path";

config({ path: path.join(__dirname, "..", ".env.local") });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const OUTPUT_PATH = path.join(__dirname, "..", ".lighthouse-auth-cookie");
const LOGIN_TIMEOUT_MS = 15000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const email = requireEnv("LIGHTHOUSE_AUTH_EMAIL");
  const password = requireEnv("LIGHTHOUSE_AUTH_PASSWORD");

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/login`);
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);

    await Promise.all([
      page.waitForURL((url) => url.pathname !== "/login", {
        timeout: LOGIN_TIMEOUT_MS,
      }),
      page.locator("button[type=submit]").click(),
    ]);

    const cookies = await context.cookies(BASE_URL);
    if (cookies.length === 0) {
      throw new Error(
        "Login navigation succeeded but no cookies were captured for " +
          BASE_URL,
      );
    }

    const cookieHeader = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    writeFileSync(OUTPUT_PATH, cookieHeader, "utf-8");
    console.log(`Wrote authenticated cookie to ${OUTPUT_PATH}`);
  } catch (error) {
    throw new Error(
      `Login did not complete within ${LOGIN_TIMEOUT_MS}ms (still on /login, ` +
        `or navigation failed): ${error instanceof Error ? error.message : error}`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
