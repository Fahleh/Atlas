-- NOTE: the "project_members: members can read" policy below is
-- self-referencing (it queries project_members from within its own USING
-- clause) and causes "infinite recursion detected in policy" errors once
-- real data flows through it. Preserved here exactly as originally written,
-- for historical accuracy — see 003_fix_project_members_recursion.sql for
-- the fix (a SECURITY DEFINER plpgsql helper function that breaks the cycle).

-- PROFILES
-- Anyone authenticated can read profiles
create policy "profiles: authenticated users can read"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile
create policy "profiles: users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- PROJECTS
-- Users can only see projects they own or are a member of
create policy "projects: members can read"
  on public.projects for select
  to authenticated
  using (
    owner_id = auth.uid() or
    exists (
      select 1 from public.project_members
      where project_id = projects.id
      and user_id = auth.uid()
    )
  );

-- Any authenticated user can create a project
create policy "projects: authenticated users can create"
  on public.projects for insert
  to authenticated
  with check (owner_id = auth.uid());

-- Only the owner can update a project
create policy "projects: owner can update"
  on public.projects for update
  to authenticated
  using (owner_id = auth.uid());

-- Only the owner can delete a project
create policy "projects: owner can delete"
  on public.projects for delete
  to authenticated
  using (owner_id = auth.uid());

-- PROJECT MEMBERS
-- Members can see other members of projects they belong to
-- WARNING: self-referencing — causes infinite recursion. Fixed in 003.
create policy "project_members: members can read"
  on public.project_members for select
  to authenticated
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
    )
  );

-- Only project owner can add members
create policy "project_members: owner can insert"
  on public.project_members for insert
  to authenticated
  with check (
    exists (
      select 1 from public.projects
      where id = project_id
      and owner_id = auth.uid()
    )
  );

-- Only project owner can remove members
create policy "project_members: owner can delete"
  on public.project_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.projects
      where id = project_id
      and owner_id = auth.uid()
    )
  );

-- TASKS
-- Project members can read tasks in their projects
create policy "tasks: project members can read"
  on public.tasks for select
  to authenticated
  using (
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
  );

-- Project members can create tasks
create policy "tasks: project members can create"
  on public.tasks for insert
  to authenticated
  with check (
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
  );

-- Project members can update tasks
create policy "tasks: project members can update"
  on public.tasks for update
  to authenticated
  using (
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
  );

-- Only project owner can delete tasks
create policy "tasks: owner can delete"
  on public.tasks for delete
  to authenticated
  using (
    exists (
      select 1 from public.projects
      where id = tasks.project_id
      and owner_id = auth.uid()
    )
  );
