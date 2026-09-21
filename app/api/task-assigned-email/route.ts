import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/baseUrl";
import { authorizeTaskAssignedEmail } from "@/lib/authorizeTaskAssignedEmail";
import { isPermanentSmtpFailure } from "@/lib/email/sendMemberAddedEmail";
import { sendTaskAssignedEmail } from "@/lib/email/sendTaskAssignedEmail";
import { after, NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/task-assigned-email
 *
 * Side channel for features/tasks/taskActions.ts's assignTask() and
 * createTaskAction(). See docs/decisions.md.
 */
export const maxDuration = 30;

const RETRY_DELAYS_MS = [1000, 3000];

async function sendWithRetry(
  input: Parameters<typeof sendTaskAssignedEmail>[0],
): Promise<void> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      await sendTaskAssignedEmail(input);
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { taskId, projectId, assigneeId } = (body ?? {}) as {
    taskId?: unknown;
    projectId?: unknown;
    assigneeId?: unknown;
  };

  if (
    typeof taskId !== "string" ||
    typeof projectId !== "string" ||
    typeof assigneeId !== "string"
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const authResult = await authorizeTaskAssignedEmail(supabase, {
    taskId,
    projectId,
    assigneeId,
  });

  if (!authResult.authorized) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { data: assigneeEmail } = await supabase.rpc(
    "get_email_for_project_member",
    { _user_id: assigneeId, _project_id: projectId },
  );

  if (!assigneeEmail) {
    return NextResponse.json(
      { error: "Assignee email not found." },
      { status: 500 },
    );
  }

  const taskUrl = `${getBaseUrl()}/projects?project=${projectId}`;

  after(() =>
    sendWithRetry({
      to: assigneeEmail,
      actorName: authResult.actorName,
      taskTitle: authResult.taskTitle,
      projectName: authResult.projectName,
      taskUrl,
    }),
  );

  return NextResponse.json({ queued: true });
}
