import nodemailer from "nodemailer";

// ---- Types ------------------------------------------------------------------

export type SendMemberAddedEmailInput = {
  to: string;
  actorName: string;
  projectName: string;
  projectUrl: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
};

// ---- Config -----------------------------------------------------------------

/**
 * Reads and validates the SMTP env vars this send depends on. Throws naming
 * exactly which var is missing rather than failing silently or falling back,
 * there is no safe default for an SMTP credential the way there is for
 * NEXT_PUBLIC_BASE_URL. Not gated on VERCEL like lib/baseUrl.ts's
 * getBaseUrl(), that gating exists to protect build-time CSP, which has no
 * equivalent concern here since this only ever runs at request time.
 *
 * @returns the validated SMTP host, port, user, password, and from address
 * @throws when any of SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM is unset
 */
export function getSmtpConfig(): SmtpConfig {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;

  if (!host) throw new Error("SMTP_HOST is not set.");
  if (!port) throw new Error("SMTP_PORT is not set.");
  if (!user) throw new Error("SMTP_USER is not set.");
  if (!password) throw new Error("SMTP_PASSWORD is not set.");
  if (!from) throw new Error("SMTP_FROM is not set.");

  const parsedPort = Number(port);
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error("SMTP_PORT is not a valid port number.");
  }

  return { host, port: parsedPort, user, password, from };
}

// ---- Template -----------------------------------------------------------------

// Hex values below are hardcoded, not var(--color-*), same email-client
// constraint as the two Supabase templates, not covered by that entry.
function buildMemberAddedEmailHtml({
  actorName,
  projectName,
  projectUrl,
}: Omit<SendMemberAddedEmailInput, "to">): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You've been added to a project</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:12px; border:1px solid #e4e4e7;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 40px; border-bottom:1px solid #e4e4e7;">
              <span style="font-size:16px; font-weight:700; color:#9e5f00; vertical-align:middle;">Atlas</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px 0; font-size:24px; line-height:1.3; font-weight:700; color:#18181b;">You've been added to a project</h1>
              <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#52525b;">
                ${actorName} added you as a collaborator on <strong style="color:#18181b;">${projectName}</strong> on Atlas.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px; background-color:#a36200;">
                    <a href="${projectUrl}"
                       style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">
                      View project
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px; background-color:#fafafa; border:1px solid #e4e4e7; border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px; font-size:12px; line-height:1.6; color:#a1a1aa;">
                    Button not working? Paste this link into your browser:<br>
                    <a href="${projectUrl}" style="color:#9e5f00; word-break:break-all;">${projectUrl}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px; background-color:#fafafa; border-top:1px solid #e4e4e7; border-radius:0 0 12px 12px; font-size:12px; line-height:1.6; color:#a1a1aa;">
              You received this email because you were added as a collaborator on an Atlas project.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---- Retry classification ---------------------------------------------------

/**
 * Decides whether a failed send is worth retrying. EAUTH (bad credentials)
 * and a 5xx SMTP response (rejected recipient, policy block) are permanent,
 * anything else, a connection/timeout error or a 4xx response, is worth
 * another attempt.
 *
 * @param error - the error thrown by sendMemberAddedEmail
 * @returns true if retrying would be pointless
 */
export function isPermanentSmtpFailure(error: unknown): boolean {
  const { code, responseCode } = error as {
    code?: string;
    responseCode?: number;
  };
  if (code === "EAUTH") return true;
  return typeof responseCode === "number" && responseCode >= 500;
}

// ---- Send -----------------------------------------------------------------

/**
 * Sends the "you were added to a project" notification over SMTP.
 * A single attempt, no retry. The retry loop lives in the caller
 * (app/api/member-added-email/route.ts); isPermanentSmtpFailure above is
 * what it uses to decide whether to keep retrying.
 *
 * @param input - recipient, the actor's display name, the project name, and a link to the project
 * @throws the raw Nodemailer/SMTP error on send failure, carries `.code` and `.responseCode` for isPermanentSmtpFailure to read
 */
export async function sendMemberAddedEmail(
  input: SendMemberAddedEmailInput,
): Promise<void> {
  const smtp = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: false,
    requireTLS: true,
    auth: { user: smtp.user, pass: smtp.password },
  });

  await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject: "You've been added to a project on Atlas",
    html: buildMemberAddedEmailHtml(input),
  });
}
