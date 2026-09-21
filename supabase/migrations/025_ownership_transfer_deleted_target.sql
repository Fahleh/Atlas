-- Fixes transfer_project_ownership(): it checked that the target held a
-- collaborator row, but never checked that row belonged to a live account.
-- A transfer could succeed into a soft-deleted user, who can then never
-- authenticate again (reject_deleted_user_token blocks both grant types
-- unconditionally, 019_reject_deleted_user_token_hook.sql), permanently
-- orphaning the project for every owner-only action: rename, delete,
-- add/remove member, delete task. There is no recovery path once that
-- happens, since transferring ownership back out also requires being the
-- current owner.
--
-- Only the collaborator-check clause changes. Everything else in the
-- function, the caller-is-owner check, the demote/promote updates, the
-- activity_log insert, is unchanged.
create or replace function public.transfer_project_ownership(
  _project_id uuid,
  _new_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _old_owner_id uuid := auth.uid();
  _old_owner_name text;
  _new_owner_name text;
begin
  if not exists (
    select 1 from public.projects
    where id = _project_id and owner_id = _old_owner_id
  ) then
    raise exception 'Only the current project owner can transfer ownership.';
  end if;

  if not exists (
    select 1 from public.project_members pm
    join public.profiles p on p.id = pm.user_id
    where pm.project_id = _project_id
    and pm.user_id = _new_owner_id
    and pm.role = 'collaborator'
    and p.deleted_at is null
  ) then
    raise exception 'Target must be an active, existing collaborator on this project.';
  end if;

  update public.project_members
  set role = 'collaborator'
  where project_id = _project_id and user_id = _old_owner_id;

  update public.project_members
  set role = 'owner'
  where project_id = _project_id and user_id = _new_owner_id;

  update public.projects
  set owner_id = _new_owner_id
  where id = _project_id;

  select activity_actor_name(_old_owner_id) into _old_owner_name;
  select activity_actor_name(_new_owner_id) into _new_owner_name;

  insert into public.activity_log
    (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
  values
    (_project_id, _old_owner_id, _old_owner_name, 'ownership_transferred',
     'project_member', _new_owner_id, _new_owner_name,
     jsonb_build_object('previousOwnerId', _old_owner_id, 'previousOwnerName', _old_owner_name));
end;
$$;
