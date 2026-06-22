# Supabase migrations runbook

Apply Curavon schema and RLS before rewiring app code off `localStorage`.

## Prerequisites

- Supabase project created
- `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Supabase CLI installed (`npm i -g supabase`) **or** SQL Editor access in the dashboard

## Apply migrations

### Option A — Supabase CLI (recommended)

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Migrations run in order from `supabase/migrations/`:

1. `20250618100000_curavon_extensions_and_helpers.sql`
2. `20250618100001_curavon_app_schema.sql`
3. `20250618100002_curavon_rls_policies.sql`
4. `20250618100003_curavon_auth_profile_trigger.sql`
5. `20250618100004_curavon_table_grants.sql` — **required** on projects with opt-in Data API table exposure (fixes `42501 permission denied`)

### Option B — SQL Editor

Run each migration file above **in order** in the Supabase SQL Editor.

Legacy reference copies remain in `docs/backend/supabase-schema-v1.sql` and `docs/backend/supabase-rls-v1.sql` but **migrations are authoritative**.

## Verify schema

In SQL Editor:

```sql
select tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles', 'health_profiles', 'health_flows', 'care_circles', 'care_circle_members'
  )
order by tablename;
```

Expect **26** application tables (see migration schema file).

## Two-user isolation check

1. Create **User A** and **User B** in Authentication → Users.
2. Sign in as User A in the app (or use SQL with User A JWT).
3. Insert a row owned by User A:

```sql
insert into public.health_profiles (user_id, payload)
values (auth.uid(), '{"preferredName":"User A"}'::jsonb);
```

4. Confirm User A can read it:

```sql
select user_id, payload from public.health_profiles where user_id = auth.uid();
```

5. Sign in as User B and repeat the `select` — **must return zero rows** for User A.
6. Confirm **anon** role cannot read:

```sql
-- as anon (no JWT): should fail or return nothing
select * from public.health_profiles;
```

7. Care Circle sanity:
   - Owner creates a circle and membership row.
   - Member can `select` **only** their `care_circle_members` row.
   - Member **cannot** read owner's `health_flows`, `doctor_summary_items`, or `care_circle_events`.

## Fail criteria

- Any app table without RLS enabled
- Policy allowing `using (true)` on health data for `anon`
- Cross-user row visibility on `user_id` tables
- Care Circle member can read another user's health flows or summaries

## Related docs

- [RLS verification checklist](../backend/rls-verification-checklist.md)
- [ADR 0001 — Supabase backend authority](../decisions/0001-backend-authority-supabase.md)
