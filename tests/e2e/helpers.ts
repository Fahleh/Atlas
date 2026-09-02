import type { Page } from "@playwright/test";

/**
 * Logs in through the real login form and waits for the dashboard to load.
 * Shared by every spec that needs an authenticated starting point.
 */
export async function loginAs(
  page: Page,
  account: { email: string; password: string },
): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(account.password);

  await Promise.all([
    page.waitForURL((url) => url.pathname === "/"),
    page.locator("button[type=submit]").click(),
  ]);
}

// Fixed port from supabase/config.toml's [local_smtp] section. Runs in the
// Playwright test process itself, not the spawned Next.js server.
const MAILPIT_URL = "http://127.0.0.1:54324";

type MailpitSearchResult = { messages: { ID: string }[] };
type MailpitMessage = { HTML: string };

/**
 * Reads the most recent email sent to `recipientEmail` from the local
 * Mailpit catcher and extracts the href of the link whose visible text is
 * `linkText`. Polls briefly since GoTrue's HTTP response can return before
 * the mail delivery to Mailpit is queryable.
 *
 * @param recipientEmail - The address the email was sent to
 * @param linkText - Exact visible text of the `<a>` tag to extract, e.g.
 *   "Choose a new password" or "Confirm email address"
 * @returns The absolute URL from the matched link's href
 */
export async function getLatestEmailLink(
  recipientEmail: string,
  linkText: string,
): Promise<string> {
  const searchUrl = `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${recipientEmail}`)}`;

  const maxAttempts = 10;
  const retryDelayMs = 500;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const searchResponse = await fetch(searchUrl);
    const { messages }: MailpitSearchResult = await searchResponse.json();

    if (messages.length > 0) {
      const messageResponse = await fetch(
        `${MAILPIT_URL}/api/v1/message/${messages[0].ID}`,
      );
      const { HTML }: MailpitMessage = await messageResponse.json();
      const match = HTML.match(
        new RegExp(`<a\\s+href="([^"]+)"[^>]*>\\s*${linkText}\\s*</a>`),
      );
      if (match) return match[1];
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }

  throw new Error(
    `No email to ${recipientEmail} with a "${linkText}" link arrived within ${(maxAttempts * retryDelayMs) / 1000}s.`,
  );
}
