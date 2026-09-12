-- Custom Access Token Hook: blocks new sign-ins and token refreshes for a
-- soft-deleted account. Verified locally against the real dev Supabase
-- stack before writing this, not assumed from docs. See docs/auth.md.
--
-- Confirmed the exception handler around the uuid cast is what actually
-- matters here, not a null check. A null user_id never fails the cast,
-- Postgres just propagates NULL. What actually crashes it is a non-null,
-- syntactically invalid uuid string, which the exception handler catches
-- by failing open (returning the event unmodified) rather than taking
-- down sign-in app-wide.

create or replace function public.reject_deleted_user_token(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _user_id uuid;
  _deleted_at timestamptz;
begin
  begin
    _user_id := (event->>'user_id')::uuid;
  exception when invalid_text_representation then
    return event;
  end;

  if _user_id is null then
    return event;
  end if;

  select deleted_at into _deleted_at
  from public.profiles
  where id = _user_id;

  if _deleted_at is not null then
    return jsonb_build_object(
      'error', jsonb_build_object('http_code', 403, 'message', 'account_deleted')
    );
  end if;

  return event;
end;
$$;

grant execute on function public.reject_deleted_user_token to supabase_auth_admin;
revoke execute on function public.reject_deleted_user_token from public, anon, authenticated;
