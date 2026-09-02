import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/baseUrl";
import { authorizeMemberAddedEmail } from "@/lib/authorizeMemberAddedEmail";
import {
  isPermanentSmtpFailure,
  sendMemberAddedEmail,
} from "@/lib/email/sendMemberAddedEmail";
import { after, NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/member-added-email
 *
 * Side channel for features/projects/projectActions.ts's addMember(). See
 * docs/decisions.md and docs/deployment.md.
 */
export const maxDuration = 30;

const RETRY_DELAYS_MS = [1000, 3000];

async function sendWithRetry(
  input: Parameters<typeof sendMemberAddedEmail>[0],
): Promise<void> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await sendMemberAddedEmail(input);
      return;
    } catch (error) {
      const isLastAttempt = attempt === RETRY_DELAYS_MS.length;
      if (isPermanentSmtpFailure(error) || isLastAttempt) return;
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAYS_MS[attempt]),
      );
    }
  }
}

export async function POST(request: NextRequest) {
  const body: unknown = await request.json();
  const { projectId, email } = (body ?? {}) as {
    projectId?: unknown;
    email?: unknown;
  };

  if (typeof projectId !== "string" || typeof email !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const authResult = await authorizeMemberAddedEmail(supabase, {
    projectId,
    email,
  });

  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const projectUrl = `${getBaseUrl()}/projects?project=${projectId}`;

  after(() =>
    sendWithRetry({
      to: email,
      actorName: authResult.actorName,
      projectName: authResult.projectName,
      projectUrl,
    }),
  );

  return NextResponse.json({ queued: true });
}
