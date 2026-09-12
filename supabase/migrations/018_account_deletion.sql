-- Soft account deletion: a deleted_at marker on profiles, RLS enforcement
-- of the deleted-user boundary across every table, and a DB-level block
-- on deleting an account that solely owns a project with other members.
-- Ownership transfer is not built, deletion is blocked in that case
-- instead. That is a deliberate v2 deferral, see docs/roadmap.md.

alter table public.profiles add column deleted_at timestamptz;

-- Caller's own active status, read once and reused across every table's
-- policies below. SECURITY DEFINER kept for consistency, not because it's
-- structurally required, see docs/database.md's "Not every same-table
-- subquery actually recurses" section for why.
create or replace function public.is_active_user()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
    and deleted_at is null
  );
end;
$$;

-- True when the caller owns a project with at least one other member.
-- Used only to block the profiles update that sets deleted_at.
create or replace function public.owner_has_multi_member_project()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.projects p
    where p.owner_id = auth.uid()
    and exists (
      select 1
      from public.project_members pm
      where pm.project_id = p.id
      and pm.user_id <> auth.uid()
    )
  );
end;
$$;

-- PROFILES
-- select policy untouched on purpose, see docs/database.md's
-- "Soft account deletion" section for why.

drop policy "profiles: users can update own profile" on public.profiles;

create policy "profiles: users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id and is_active_user())
  with check (
    auth.uid() = id
    and (deleted_at is null or not owner_has_multi_member_project())
  );

-- PROJECTS

drop policy "projects: members can read" on public.projects;
create policy "projects: members can read"
  on public.projects for select
  to authenticated
  using (
    is_active_user()
    and (
      owner_id = auth.uid() or
      exists (
        select 1 from public.project_members
        where project_id = projects.id
        and user_id = auth.uid()
      )
    )
  );

drop policy "projects: authenticated users can create" on public.projects;
create policy "projects: authenticated users can create"
  on public.projects for insert
  to authenticated
  with check (owner_id = auth.uid() and is_active_user());

drop policy "projects: owner can update" on public.projects;
create policy "projects: owner can update"
  on public.projects for update
  to authenticated
  using (owner_id = auth.uid() and is_active_user());

drop policy "projects: owner can delete" on public.projects;
create policy "projects: owner can delete"
  on public.projects for delete
  to authenticated
  using (owner_id = auth.uid() and is_active_user());

-- PROJECT MEMBERS

drop policy "project_members: members can read" on public.project_members;
create policy "project_members: members can read"
  on public.project_members for select
  to authenticated
  using (is_active_user() and is_project_member(auth.uid(), project_id));

drop policy "project_members: owner can insert" on public.project_members;
create policy "project_members: owner can insert"
  on public.project_members for insert
  to authenticated
  with check (
    is_active_user()
    and exists (
      select 1 from public.projects
      where id = project_id
      and owner_id = auth.uid()
    )
  );

drop policy "project_members: owner can delete" on public.project_members;
create policy "project_members: owner can delete"
  on public.project_members for delete
  to authenticated
  using (
    is_active_user()
    and exists (
      select 1 from public.projects
      where id = project_id
      and owner_id = auth.uid()
    )
  );

-- TASKS

drop policy "tasks: project members can read" on public.tasks;
create policy "tasks: project members can read"
  on public.tasks for select
  to authenticated
  using (
    is_active_user()
    and (
      exists (
        select 1 from public.project_members
        where project_id = tasks.project_id
        and user_id = auth.uid()
      ) or
      exists (
        select 1 from public.projects
        where id = tasks.project_id
        and owner_id = auth.uid()
      )
    )
  );

drop policy "tasks: project members can create" on public.tasks;
create policy "tasks: project members can create"
  on public.tasks for insert
  to authenticated
  with check (
    is_active_user()
    and (
      exists (
        select 1 from public.project_members
        where project_id = tasks.project_id
        and user_id = auth.uid()
      ) or
      exists (
        select 1 from public.projects
        where id = tasks.project_id
        and owner_id = auth.uid()
      )
    )
  );

drop policy "tasks: project members can update" on public.tasks;
create policy "tasks: project members can update"
  on public.tasks for update
  to authenticated
  using (
    is_active_user()
    and (
      exists (
        select 1 from public.project_members
        where project_id = tasks.project_id
        and user_id = auth.uid()
      ) or
      exists (
        select 1 from public.projects
        where id = tasks.project_id
        and owner_id = auth.uid()
      )
    )
  );

drop policy "tasks: owner can delete" on public.tasks;
create policy "tasks: owner can delete"
  on public.tasks for delete
  to authenticated
  using (
    is_active_user()
    and exists (
      select 1 from public.projects
      where id = tasks.project_id
      and owner_id = auth.uid()
    )
  );

-- ACTIVITY LOG

drop policy "activity_log: members can view" on public.activity_log;
create policy "activity_log: members can view"
  on public.activity_log for select
  to authenticated
  using (is_active_user() and is_project_member(auth.uid(), project_id));
