# Next.js Supabase env setup

Curavon reads Supabase configuration from **browser-safe** `NEXT_PUBLIC_*` variables in Next.js.

## Create `.env.local`

Copy `.env.example` to `.env.local` and set:

```env
NEXT_PUBLIC_AUTH_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://mprfgqnmtobbqycvtatd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_O9G97NvQQ6dCM8r--CKEeA_ok1v_5k1
```

Then:

1. Restart `npm run dev`
2. **Never commit** `.env.local`
3. Use the **publishable key only** (anon/publishable style key)
4. **Never** put `service_role` or other secret keys in frontend env

## Fallback behavior

If `NEXT_PUBLIC_AUTH_MODE=supabase` is set but URL/key are missing, Curavon logs a warning and falls back to `local_demo`.

## Local demo (default)

```env
NEXT_PUBLIC_AUTH_MODE=local_demo
```

Leave Supabase URL/key empty to keep device-local auth and storage.

## Notes

- Next.js only exposes `NEXT_PUBLIC_*` vars to the browser bundle.
- Legacy `VITE_*` names remain as optional fallback in `src/lib/env/publicEnv.ts` for Vitest only.
- Real secrets belong in `.env.local`, not source control.
