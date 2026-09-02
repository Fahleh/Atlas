import type { SupabaseClient } from "@supabase/supabase-js";

// ---- Types ------------------------------------------------------------------

export type AuthorizeMemberAddedEmailResult =
  | { authorized: true; actorName: string; projectName: string }
  | { authorized: false; status: 401 | 403 | 500; error: string };

// ---- Authorization ------------------------------------------------------------

/**
 * Confirms the caller is actually the project's owner and that the given
 * email is an actual member before app/api/member-added-email/route.ts
 * sends anything. See docs/decisions.md for why this route re-checks
 * authorization instead of trusting the client-supplied projectId/email pair.
 *
 * @param supabase - authenticated server Supabase client for this request
 * @param params - the project and invitee email to authorize the send for
 * @returns actor name and project name on success, or a status/error to return as-is
 */
export async function authorizeMemberAddedEmail(
  supabase: SupabaseClient,
  { projectId, email }: { projectId: string; email: string },
): Promise<AuthorizeMemberAddedEmailResult> {
  const { data: claims } = await supabase.auth.getClaims();
  const actorId = claims?.claims.sub;
  if (!actorId) {
    return { authorized: false, status: 401, error: "Not authenticated." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name, owner_id")
    .eq("id", projectId)
    .single();

  if (!project || project.owner_id !== actorId) {
    return { authorized: false, status: 403, error: "Not authorized." };
  }

  const { data: actor } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", actorId)
    .single();

  if (!actor) {
    return {
      authorized: false,
      status: 500,
      error: "Actor profile not found.",
    };
  }

  // profiles has no email column to join against directly, so membership is
  // confirmed via lookup_user_id_by_email, the same RPC addMember itself uses.
  const { data: memberUserId } = await supabase.rpc(
    "lookup_user_id_by_email",
    { _email: email },
  );

  if (!memberUserId) {
    return {
      authorized: false,
      status: 403,
      error: "No member found for that email.",
    };
  }

  const { data: membership } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)
    .eq("user_id", memberUserId)
    .maybeSingle();

  if (!membership) {
    return {
      authorized: false,
      status: 403,
      error: "That person is not a member of this project.",
    };
  }

  return { authorized: true, actorName: actor.name, projectName: project.name };
}
