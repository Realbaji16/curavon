-- =========================================================
-- Curavon Supabase Profile Trigger v1
-- Auto-creates public.profiles rows when Supabase Auth users are created.
-- Run after supabase-schema-v1.sql.
-- Safe to rerun.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =========================================================
-- Backfill existing auth users into public.profiles
-- Useful if users were created before this trigger existed.
-- =========================================================

insert into public.profiles (id, email, display_name)
select
  id,
  email,
  coalesce(
    raw_user_meta_data->>'display_name',
    raw_user_meta_data->>'full_name',
    split_part(email, '@', 1)
  )
from auth.users
on conflict (id) do update
set
  email = excluded.email,
  display_name = coalesce(public.profiles.display_name, excluded.display_name),
  updated_at = now();