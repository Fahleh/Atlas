-- 015_add_length_constraints.sql shipped without trimming whitespace before
-- measuring length, so a name or title made entirely of spaces still passed
-- the lower bound. Found and closed here, not rewritten into 015, same
-- precedent as 003_fix_project_members_recursion.sql fixing 002 in place
-- rather than editing history. Description constraints are untouched, they
-- never had a floor to game with whitespace.

alter table public.profiles
  drop constraint profiles_name_length,
  add constraint profiles_name_length check (char_length(btrim(name)) between 3 and 100);

alter table public.projects
  drop constraint projects_name_length,
  add constraint projects_name_length check (char_length(btrim(name)) between 1 and 100);

alter table public.tasks
  drop constraint tasks_title_length,
  add constraint tasks_title_length check (char_length(btrim(title)) between 1 and 100);
