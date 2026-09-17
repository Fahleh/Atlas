import nodemailer from "nodemailer";
import { getSmtpConfig } from "./sendMemberAddedEmail";

// ---- Types ------------------------------------------------------------------

export type SendTaskAssignedEmailInput = {
  to: string;
  actorName: string;
  taskTitle: string;
  projectName: string;
  taskUrl: string;
};

// ---- Template -----------------------------------------------------------------

// Hex values below are hardcoded, not var(--color-*), same email-client
// constraint as sendMemberAddedEmail.ts's template.
function buildTaskAssignedEmailHtml({
  actorName,
  taskTitle,
  projectName,
  taskUrl,
}: Omit<SendTaskAssignedEmailInput, "to">): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You've been assigned a task</title>
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
              <h1 style="margin:0 0 16px 0; font-size:24px; line-height:1.3; font-weight:700; color:#18181b;">You've been assigned a task</h1>
              <p style="margin:0 0 28px 0; font-size:15px; line-height:1.6; color:#52525b;">
                ${actorName} assigned you <strong style="color:#18181b;">${taskTitle}</strong> on <strong style="color:#18181b;">${projectName}</strong> on Atlas.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px; background-color:#a36200;">
                    <a href="${taskUrl}"
                       style="display:inline-block; padding:12px 28px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">
                      View task
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px; background-color:#fafafa; border:1px solid #e4e4e7; border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px; font-size:12px; line-height:1.6; color:#a1a1aa;">
                    Button not working? Paste this link into your browser:<br>
                    <a href="${taskUrl}" style="color:#9e5f00; word-break:break-all;">${taskUrl}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px; background-color:#fafafa; border-top:1px solid #e4e4e7; border-radius:0 0 12px 12px; font-size:12px; line-height:1.6; color:#a1a1aa;">
              You received this email because a task was assigned to you on Atlas.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---- Send -----------------------------------------------------------------

/**
 * Sends the "you were assigned a task" notification over SMTP.
 * A single attempt, no retry. The retry loop lives in the caller
 * (app/api/task-assigned-email/route.ts), using isPermanentSmtpFailure
 * from sendMemberAddedEmail.ts to decide whether to keep retrying.
 *
 * @param input - recipient, the actor's display name, the task title, the project name, and a link to the task
 * @throws the raw Nodemailer/SMTP error on send failure, carries `.code` and `.responseCode` for isPermanentSmtpFailure to read
 */
export async function sendTaskAssignedEmail(
  input: SendTaskAssignedEmailInput,
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
    subject: "You've been assigned a task on Atlas",
    html: buildTaskAssignedEmailHtml(input),
  });
}
