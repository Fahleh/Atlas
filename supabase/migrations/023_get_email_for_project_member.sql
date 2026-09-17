-- Resolves a project member's email from their user id, for the
-- task-assigned notification. See docs/database.md and docs/decisions.md.

create or replace function public.get_email_for_project_member(_user_id uuid, _project_id uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Unlike lookup_user_id_by_email, this is not safe to open to any
  -- authenticated caller: it reverses the lookup direction, so an open
  -- version would let anyone resolve any user's email from their id.
  -- Two separate checks, both required: the caller must be a member of
  -- _project_id, and the target _user_id must also be a member of that
  -- same project.
  if not public.is_project_member(auth.uid(), _project_id) then
    return null;
  end if;

  if not public.is_project_member(_user_id, _project_id) then
    return null;
  end if;

  return (
    select email from auth.users where id = _user_id
  );
end;
$$;

revoke execute on function public.get_email_for_project_member(uuid, uuid) from public;
grant execute on function public.get_email_for_project_member(uuid, uuid) to authenticated;
