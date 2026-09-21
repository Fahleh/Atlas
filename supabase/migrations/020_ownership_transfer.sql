-- Ownership transfer: an owner can hand off a project to an existing
-- collaborator. Flips both project_members rows and projects.owner_id
-- atomically, and logs a real activity_log entry distinct from the
-- bootstrap owner-insert skip and from member_added/member_removed.
-- Resolves the "Ownership transfer" deferral in docs/roadmap.md.
--
-- SECURITY DEFINER is required, not just convenient: project_members has
-- no UPDATE policy at all (checked 002/003/018_*.sql), so a direct client
-- update is rejected outright. "projects: owner can update" also has no
-- explicit WITH CHECK, so Postgres reuses its USING clause (owner_id =
-- auth.uid()) as the check on the new row, which would reject setting
-- owner_id to anyone but the caller. See docs/database.md.

-- Enforces at most one owner row per project, never enforceable before this
-- feature. See docs/decisions.md's ownership-transfer entry.
do $$
declare
  _duplicate_count int;
  _missing_count int;
begin
  select count(*) into _duplicate_count
  from (
    select project_id
    from public.project_members
    where role = 'owner'
    group by project_id
    having count(*) > 1
  ) dupes;

  select count(*) into _missing_count
  from public.projects p
  where not exists (
    select 1 from public.project_members pm
    where pm.project_id = p.id and pm.role = 'owner'
  );

  if _duplicate_count > 0 then
    raise exception 'Found % project(s) with more than one owner row in project_members, resolve before adding the unique index', _duplicate_count;
  end if;

  if _missing_count > 0 then
    raise exception 'Found % project(s) with no owner row in project_members, resolve before adding the unique index', _missing_count;
  end if;
end $$;

create unique index project_members_project_id_idx
  on public.project_members (project_id)
  where role = 'owner';

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
    select 1 from public.project_members
    where project_id = _project_id
    and user_id = _new_owner_id
    and role = 'collaborator'
  ) then
    raise exception 'Target must be an existing collaborator on this project.';
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

grant execute on function public.transfer_project_ownership(uuid, uuid) to authenticated;

alter table public.activity_log drop constraint activity_log_verb_check;
alter table public.activity_log add constraint activity_log_verb_check
  check (verb in (
    'project_created', 'project_updated',
    'task_created', 'task_status_changed', 'task_updated', 'task_deleted',
    'member_added', 'member_removed', 'ownership_transferred'
  ));

-- Re-created with a comment only, no logic change. Owner-role inserts are
-- the bootstrap row from handle_new_project, never a real member addition.
-- A genuine ownership change now logs its own event from
-- transfer_project_ownership() above, not from this trigger.
create or replace function public.handle_member_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.role = 'collaborator' then
      insert into public.activity_log
        (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
      values
        (new.project_id, _actor, activity_actor_name(_actor), 'member_added', 'project_member', new.user_id,
         activity_actor_name(new.user_id), jsonb_build_object('role', new.role));
    end if;
    return new;
  end if;

  if exists (select 1 from public.projects where id = old.project_id) then
    insert into public.activity_log
      (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
    values
      (old.project_id, _actor, activity_actor_name(_actor), 'member_removed', 'project_member', old.user_id,
       activity_actor_name(old.user_id), jsonb_build_object('role', old.role));
  end if;
  return old;
end;
$$;