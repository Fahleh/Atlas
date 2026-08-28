create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  verb text not null check (verb in (
    'project_created', 'project_updated',
    'task_created', 'task_status_changed', 'task_updated', 'task_deleted',
    'member_added', 'member_removed'
  )),
  entity_type text not null check (entity_type in ('project', 'task', 'project_member')),
  entity_id uuid,
  entity_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_project_id_created_at_idx
  on public.activity_log (project_id, created_at desc);

alter table public.activity_log enable row level security;

create policy "activity_log: members can view"
  on public.activity_log for select
  to authenticated
  using (is_project_member(auth.uid(), project_id));

grant select on public.activity_log to authenticated;

create or replace function public.activity_actor_name(_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(name, 'Unknown') from public.profiles where id = _user_id;
$$;

-- PROJECTS
create or replace function public.handle_project_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor uuid := auth.uid();
  _changes jsonb := '[]'::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log
      (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
    values
      (new.id, _actor, activity_actor_name(_actor), 'project_created', 'project', new.id, new.name, '{}'::jsonb);
    return new;
  end if;

  if new.name is distinct from old.name then
    _changes := _changes || jsonb_build_object('field', 'name', 'from', old.name, 'to', new.name);
  end if;
  if new.description is distinct from old.description then
    _changes := _changes || jsonb_build_object('field', 'description', 'from', old.description, 'to', new.description);
  end if;
  if new.status is distinct from old.status then
    _changes := _changes || jsonb_build_object('field', 'status', 'from', old.status, 'to', new.status);
  end if;
  if new.due_date is distinct from old.due_date then
    _changes := _changes || jsonb_build_object('field', 'due_date', 'from', old.due_date, 'to', new.due_date);
  end if;

  if jsonb_array_length(_changes) > 0 then
    insert into public.activity_log
      (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
    values
      (new.id, _actor, activity_actor_name(_actor), 'project_updated', 'project', new.id, new.name, jsonb_build_object('changes', _changes));
  end if;
  return new;
end;
$$;

create trigger on_project_created_activity
  after insert on public.projects
  for each row execute function public.handle_project_activity();

create trigger on_project_updated_activity
  after update on public.projects
  for each row execute function public.handle_project_activity();

-- TASKS
create or replace function public.handle_task_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _actor uuid := auth.uid();
  _changes jsonb := '[]'::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log
      (project_id, actor_id, actor_name, verb, entity_type, entity_id, entity_name, metadata)
    values
      (new.project_id, _actor, activity_actor_name(_actor), 'task_created', 'task', new.id, new.title, '{}'::jsonb);
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

create trigger on_task_created_activity
  after insert on public.tasks
  for each row execute function public.handle_task_activity();

create trigger on_task_updated_activity
  after update on public.tasks
  for each row execute function public.handle_task_activity();

create trigger on_task_deleted_activity
  after delete on public.tasks
  for each row execute function public.handle_task_activity();

-- PROJECT_MEMBERS
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

create trigger on_project_member_added_activity
  after insert on public.project_members
  for each row execute function public.handle_member_activity();

create trigger on_project_member_removed_activity
  after delete on public.project_members
  for each row execute function public.handle_member_activity();