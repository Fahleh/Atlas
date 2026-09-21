-- Task assignment: enforces assignee project-membership at the
-- database level, and logs task_assigned/task_unassigned. See
-- docs/database.md and docs/decisions.md.

create or replace function public.check_assignee_is_project_member()
returns trigger
language plpgsql
as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.project_members
    where project_id = new.project_id and user_id = new.assignee_id
  ) then
    raise exception 'Assignee must be a member of this project.';
  end if;
  return new;
end;
$$;

create trigger enforce_assignee_membership
  before insert or update of assignee_id on public.tasks
  for each row execute function check_assignee_is_project_member();

alter table public.activity_log drop constraint activity_log_verb_check;
alter table public.activity_log add constraint activity_log_verb_check
  check (verb in (
    'project_created', 'project_updated',
    'task_created', 'task_status_changed', 'task_updated', 'task_deleted',
    'member_added', 'member_removed', 'ownership_transferred',
    'task_assigned', 'task_unassigned'
  ));

create or replace function public.handle_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor uuid := auth.uid();
  _changes jsonb := '[]'::jsonb;
  _assign_metadata jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log
      (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
    values
      (new.project_id, _actor, activity_actor_name(_actor), 'task_created', 'task', new.id, new.title, '{}'::jsonb);

    if new.assignee_id is not null then
      insert into public.activity_log
        (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
      values
        (new.project_id, _actor, activity_actor_name(_actor), 'task_assigned', 'task', new.id, new.title,
         jsonb_build_object('assigneeId', new.assignee_id, 'assigneeName', activity_actor_name(new.assignee_id)));
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if exists (select 1 from public.projects where id = old.project_id) then
      insert into public.activity_log
        (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
      values
        (old.project_id, _actor, activity_actor_name(_actor), 'task_deleted', 'task', old.id, old.title, '{}'::jsonb);
    end if;
    return old;
  end if;

  if new.status is distinct from old.status then
    insert into public.activity_log
      (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
    values
      (new.project_id, _actor, activity_actor_name(_actor), 'task_status_changed', 'task', new.id, new.title,
       jsonb_build_object('from', old.status, 'to', new.status));
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    if new.assignee_id is not null then
      _assign_metadata := jsonb_build_object(
        'assigneeId', new.assignee_id,
        'assigneeName', activity_actor_name(new.assignee_id)
      );
      if old.assignee_id is not null then
        _assign_metadata := _assign_metadata || jsonb_build_object(
          'previousAssigneeId', old.assignee_id,
          'previousAssigneeName', activity_actor_name(old.assignee_id)
        );
      end if;
      insert into public.activity_log
        (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
      values
        (new.project_id, _actor, activity_actor_name(_actor), 'task_assigned', 'task', new.id, new.title, _assign_metadata);
    else
      insert into public.activity_log
        (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
      values
        (new.project_id, _actor, activity_actor_name(_actor), 'task_unassigned', 'task', new.id, new.title,
         jsonb_build_object(
           'previousAssigneeId', old.assignee_id,
           'previousAssigneeName', activity_actor_name(old.assignee_id)
         ));
    end if;
  end if;

  if new.title is distinct from old.title then
    _changes := _changes || jsonb_build_object('field', 'title', 'from', old.title, 'to', new.title);
  end if;
  if new.description is distinct from old.description then
    _changes := _changes || jsonb_build_object('field', 'description', 'from', old.description, 'to', new.description);
  end if;
  if new.due_date is distinct from old.due_date then
    _changes := _changes || jsonb_build_object('field', 'due_date', 'from', old.due_date, 'to', new.due_date);
  end if;

  if jsonb_array_length(_changes) > 0 then
    insert into public.activity_log
      (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
    values
      (new.project_id, _actor, activity_actor_name(_actor), 'task_updated', 'task', new.id, new.title, jsonb_build_object('changes', _changes));
  end if;
  return new;
end;
$$;
