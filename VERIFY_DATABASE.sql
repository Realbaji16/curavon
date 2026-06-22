-- Run this in Supabase SQL Editor to see what's wrong
-- https://supabase.com/dashboard/project/mprfgqnmtobbqycvtatd/sql/new

-- 1) Do Curavon tables exist?
select tablename
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'health_profiles', 'health_flows')
order by tablename;
-- Expect 3 rows. If 0 rows → run SETUP_SUPABASE.sql (full setup)

-- 2) Does authenticated role have access?
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('health_profiles', 'health_flows')
  and grantee in ('authenticated', 'anon', 'service_role')
group by table_name, grantee
order by table_name, grantee;
-- Expect authenticated + service_role with SELECT, INSERT, UPDATE, DELETE
-- If empty → run FIX_DATABASE.sql or the grants section of SETUP_SUPABASE.sql
