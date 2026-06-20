# Next.js Supabase setup (Step 18)

Follow these steps to connect Curavon to your Supabase project.

## 1. Confirm Supabase project exists

Use your existing Curavon Supabase project.

## 2. Copy Project URL and publishable key

From **Project Settings → API**:

- Project URL
- Publishable (anon) key — **not** `service_role`

## 3. Create `.env.local`

See [nextjs-supabase-env-setup.md](./nextjs-supabase-env-setup.md).

```env
NEXT_PUBLIC_AUTH_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

## 4. Install dependency

```bash
npm install @supabase/supabase-js
```

## 5. Run schema SQL

In Supabase **SQL Editor**, run:

- [supabase-schema-v1.sql](./supabase-schema-v1.sql)

## 6. Run RLS SQL

In Supabase **SQL Editor**, run:

- [supabase-rls-v1.sql](./supabase-rls-v1.sql)

## 7. Enable email/password auth

In **Authentication → Providers**, enable Email if not already enabled.

Configure email confirmation policy as needed for your environment.

## 8. Add local dev URL

In **Authentication → URL Configuration**, add:

- `http://localhost:3000`

## 9. Restart Next dev server

```bash
npm run dev
```

## 10. Create a fake test user

Use AuthFlow sign up or Supabase dashboard to create a test account.

## 11. Test sign up, sign in, sign out

- Sign up creates a Supabase auth user
- Sign in restores session
- Sign out clears Supabase session only (health data unchanged)

## 12. Verify RLS with fake test data

Insert a row as the authenticated user and confirm another user cannot read it.

Example (as signed-in user via app or SQL with JWT):

```sql
select * from public.health_profiles where user_id = auth.uid();
```

## What is wired in Step 18

- Browser Supabase client (`src/lib/supabase/supabaseClient.ts`)
- Auth mode config with `local_demo` fallback
- Supabase auth adapter (email/password)
- Supabase data adapter foundation (not full UI wiring)
- Local → Supabase migration scaffold (manual, opt-in later)

## What is not wired yet

- Full UI data layer switch from `localStorage` to Supabase
- Migration UI in Settings
- Server-side Supabase routes / service role utilities
- Account deletion via Supabase admin API
