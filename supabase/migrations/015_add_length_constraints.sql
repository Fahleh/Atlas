-- Length constraints on user-supplied text fields, verified against live
-- data before applying. See docs/decisions.md for the review that found
-- this gap and the bounds chosen.

alter table public.profiles
  add constraint profiles_name_length check (char_length(name) between 3 and 100);

alter table public.projects
  add constraint projects_name_length check (char_length(name) between 1 and 100),
  add constraint projects_description_length check (description is null or char_length(description) <= 2000);

alter table public.tasks
  add constraint tasks_title_length check (char_length(title) between 1 and 100),
  add constraint tasks_description_length check (description is null or char_length(description) <= 2000);
