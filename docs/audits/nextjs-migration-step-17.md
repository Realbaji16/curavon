# Step 17 — Next.js Migration Audit

Date: 2026-06-19  
Scope: Migrate Curavon from Vite to Next.js App Router without Supabase connection or product behavior changes.

---

## 1. Old Vite structure

| Piece | Location |
|-------|----------|
| HTML entry | `index.html` |
| JS entry | `src/main.tsx` → `App.tsx` |
| Build | `vite.config.ts` |
| Global CSS | `src/styles/index.css` (via `App.tsx`) |
| Dev URL | `http://localhost:5173` |
| Env | `import.meta.env.VITE_*` |

---

## 2. New Next.js structure

```
app/
  layout.tsx          Root layout + metadata
  page.tsx            Server wrapper → client page
  CuravonRootPage.tsx Client boundary ('use client')
  globals.css         @import src/styles/index.css
  api/health/route.ts Health JSON endpoint
src/
  CuravonClientApp.tsx  Main app shell (from App.tsx)
  components/ screens/ context/ lib/ …  (unchanged paths)
```

Single route: `/` — internal tab nav unchanged.

---

## 3. Files created / changed

**Created**

- `app/layout.tsx`, `app/page.tsx`, `app/CuravonRootPage.tsx`, `app/globals.css`
- `app/api/health/route.ts`
- `src/CuravonClientApp.tsx`
- `src/lib/env/publicEnv.ts`
- `src/lib/auth/authConfig.ts`
- `src/lib/supabase/supabaseClient.ts`
- `next.config.ts`, `next-env.d.ts`
- `.env.example`
- `docs/audits/nextjs-migration-step-17.md`
- `docs/backend/nextjs-migration-notes.md`

**Changed**

- `package.json` — Next scripts, `next` dependency
- `tsconfig.json` — Next paths, exclude legacy Vite entry
- `vitest.config.ts` — path aliases, thread pool
- `eslint.config.js` — ignore `.next`
- `src/lib/ai/aiConfig.ts` — `NEXT_PUBLIC_OPENAI_API_KEY`
- `src/lib/auth/authTypes.ts` — `supabase` mode type (adapter still local fallback)
- `src/lib/auth/authAdapter.ts` — safe fallback
- `src/App.tsx` — legacy Vite mirror + auth mode from config
- `README.md` — Next quick start

**Legacy (inactive, kept)**

- `index.html`, `src/main.tsx`, `vite.config.ts`

---

## 4. Client / server boundary

| Layer | Decision |
|-------|----------|
| `app/page.tsx` | Server Component — imports client wrapper only |
| `app/CuravonRootPage.tsx` | `'use client'` — renders `CuravonClientApp` |
| `src/CuravonClientApp.tsx` | `'use client'` — providers, tabs, lazy screens |
| `app/api/health/route.ts` | Server Route Handler — no secrets |
| Storage utils | `typeof window` guards (existing + unchanged) |
| Context initial state | Uses guarded `safeRead` — SSR-safe defaults |

No URL split for tabs in this step.

---

## 5. CSS migration

- `app/globals.css` → `@import '../src/styles/index.css'`
- Cascade preserved (tokens → base → layout → components → overlays → screens → legacy `App.css`)
- No class or theme variable renames

---

## 6. Env variable changes

| Old (Vite) | New (Next) |
|------------|------------|
| `VITE_AUTH_MODE` | `NEXT_PUBLIC_AUTH_MODE` |
| `VITE_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `VITE_OPENAI_API_KEY` | `NEXT_PUBLIC_OPENAI_API_KEY` |

Read via `src/lib/env/publicEnv.ts` with optional VITE fallback for migration/tests.

**Not in repo:** user Supabase values belong in `.env.local` only.

---

## 7. Tests / build status

| Command | Status |
|---------|--------|
| `npm run build` | **Pass** (Next 16.2.9) |
| `npm run test` | **80/80 passed** |
| `npm run lint` | **Pass** |

---

## 8. Remaining carryovers

- Split tabs into `/today`, `/ask`, etc. (optional later)
- Wire Supabase SDK + auth adapter when backend step lands
- Remove legacy Vite entry files after team confirmation
- ESLint `react-refresh` plugin still Vite-oriented (harmless)
- `tsconfig.app.json` / `tsconfig.node.json` — legacy references, Next uses root `tsconfig.json`
- Server-side AI routes, export jobs, middleware — future steps
- `@supabase/supabase-js` not installed yet
