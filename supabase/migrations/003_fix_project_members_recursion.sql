-- Fixes: 42P17 infinite recursion detected in policy for relation "project_members"
--
-- Root cause: the original "project_members: members can read" policy
-- (see 002_rls_policies.sql) queries project_members from within its own
-- USING clause. Every evaluation of the policy re-triggers itself to satisfy
-- the inner query, recursing until Postgres detects the cycle and errors.
--
-- Fix: a SECURITY DEFINER function bypasses RLS on its internal query,
-- breaking the cycle. Must be LANGUAGE plpgsql, not LANGUAGE sql — Postgres's
-- planner can inline a simple SQL function directly into the calling policy
-- at plan time, which silently discards the SECURITY DEFINER context and
-- reintroduces the recursion despite looking fixed. plpgsql functions are
-- never inlined.

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
