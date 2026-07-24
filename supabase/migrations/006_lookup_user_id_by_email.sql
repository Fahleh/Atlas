-- Enables "add project member by email" without exposing profiles.email
-- (which deliberately does not exist — email lives only in auth.users,
-- owned by Supabase Auth, to avoid a second source of truth requiring an
-- additional sync trigger). SECURITY DEFINER is required here because a
-- normal authenticated role has no direct access to auth.users.

create or replace function public.lookup_user_id_by_email(_email text)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Deliberately callable by any authenticated user, not just project owners.
  -- A per-project ownership gate was evaluated and rejected: project creation
  -- is free and unrestricted, so an attacker could trivially create a
  -- throwaway project to satisfy an ownership check, making it security
  -- theater rather than a real boundary. This function's existence inherently
  -- allows probing "does an account exist for this email" — the same
  -- property present in any invite-by-email flow (Slack, Notion, GitHub org
  -- invites all share it). Accepted as standard scope for this feature category.
  return (
    select id from auth.users
    where lower(email) = lower(_email)
    limit 1
  );
end;
$$;

revoke execute on function public.lookup_user_id_by_email(text) from public;
grant execute on function public.lookup_user_id_by_email(text) to authenticated;
