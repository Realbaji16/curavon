-- Curavon / Healthy.Ai — extensions and shared helpers
-- Migration: 20250618100000

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Maintains updated_at on Curavon mutable tables.';
