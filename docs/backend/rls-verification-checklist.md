# RLS verification checklist

Run after applying `supabase-schema-v1.sql` and `supabase-rls-v1.sql`.

## Setup

1. Create **user A** (email/password)
2. Create **user B** (email/password)
3. Sign in as user A in the app or SQL editor with user A JWT

## Checks

1. **User A insert** — insert a sample `health_profiles` row with `user_id = auth.uid()`
2. **User A read own** — user A can `select` their row
3. **User B isolation** — user B cannot `select` user A's row
4. **Unauthenticated** — anon/unauthenticated request cannot read health data
5. **Insert ownership** — user can insert only with `user_id = auth.uid()`
6. **No public read** — confirm no policies allow `using (true)` for health tables
7. **profiles policy** — `auth.uid() = id` on `profiles`
8. **user-owned tables** — `auth.uid() = user_id` on all non-profile tables
9. **activity_insights** — RLS enabled; own-row only
10. **red_flag_logs** — RLS enabled; own-row only
11. **data_export_requests** — RLS enabled; own-row only
12. **data_deletion_requests** — RLS enabled; own-row only

## Example SQL (as user A)

```sql
insert into public.health_profiles (user_id, payload)
values (auth.uid(), '{"preferredName":"Test A"}'::jsonb);

select * from public.health_profiles where user_id = auth.uid();
```

Sign in as user B and repeat `select` — should return zero rows for user A's data.

## API sanity

- `GET /api/health` — no keys in response
- `GET /api/auth/session` — no email required; `userId` only when authenticated

## Fail criteria

- Any health table without RLS
- Public read policy on health data
- Cross-user row visibility
- Client bundle references `service_role`
