-- Fixes 42P17 infinite recursion in "project_members: members can read"
-- (002_rls_policies.sql). See docs/database.md's "Correct recursion escape".

create or replace function public.is_project_member(_user_id uuid, _project_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.project_members
    where project_id = _project_id
    and user_id = _user_id
  );
end;
$$;

drop policy "project_members: members can read" on public.project_members;

create policy "project_members: members can read"
  on public.project_members for select
  to authenticated
  using (is_project_member(auth.uid(), project_id));
