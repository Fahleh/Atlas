-- Enables "add project member by email" without exposing profiles.email.
-- See docs/database.md's lookup_user_id_by_email section.

create or replace function public.lookup_user_id_by_email(_email text)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  -- Deliberately callable by any authenticated user, not project owners
  -- only. See docs/database.md's lookup_user_id_by_email section for why.
  return (
    select id from auth.users
    where lower(email) = lower(_email)
    limit 1
  );
end;
$$;

revoke execute on function public.lookup_user_id_by_email(text) from public;
grant execute on function public.lookup_user_id_by_email(text) to authenticated;
