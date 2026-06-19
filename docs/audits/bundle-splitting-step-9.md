# Curavon Step 9 — Bundle Size + Route Code Splitting

**Date:** 2026-06-18  
**Goal:** Reduce main JavaScript bundle size and improve production loading performance without changing product behavior.

---

## Baseline build (before changes)

Command: `npm run build`

| Asset | Size (min) | Gzip |
|-------|------------|------|
| `dist/assets/index-BpUxLU0u.js` | **601.43 kB** | 175.19 kB |
| `dist/assets/index-BminaI9t.css` | 150.16 kB | 26.37 kB |
| `dist/index.html` | 0.51 kB | 0.33 kB |

**Vite warning:** `Some chunks are larger than 500 kB after minification` (single monolithic JS chunk).

---

## Files changed

### New
- `src/components/RouteLoadingFallback.tsx` — calm tab/overlay loading copy
- `src/components/LazyDoctorSummaryOverlay.tsx` — lazy Doctor Summary shell
- `docs/audits/bundle-splitting-step-9.md` — this document

### Modified
- `src/App.tsx` — `React.lazy` for Ask, Guides, Settings; `Suspense` boundary in `MainAppTabs`
- `src/components/AppAuthGate.tsx` — Doctor Summary overlay only on authenticated shell; lazy mount
- `src/App.css` — `.route-loading-shell` / `.route-loading-text` styles
- `vite.config.ts` — optional `manualChunks` for React, framer-motion, lucide-react

---

## Routes / components split

### Lazy-loaded tab screens (`React.lazy`)
| Route / tab | Module | Chunk (after) |
|-------------|--------|---------------|
| Ask | `screens/AskCuravon.tsx` | ~24.3 kB |
| Guides (`circle` / legacy `flow`) | `screens/CareCircle.tsx` | ~32.7 kB |
| Profile / Settings | `screens/Settings.tsx` | ~20.2 kB |

### Eager (initial path)
| Screen | Reason |
|--------|--------|
| `HomeScreen` | Default Today tab — first authenticated view |
| `Onboarding` | Pre-auth entry |
| `AuthFlow` | Pre-app entry |
| Contexts / providers | Required for shell + health state |

### Lazy-loaded overlay
| Component | Trigger | Chunk |
|-----------|---------|-------|
| `DoctorSummaryOverlay` (+ `DoctorSummaryHub`) | First open of Doctor Summary | ~6.9 kB |

`DoctorSummaryProvider` remains eager (context + storage only on initial load).

---

## Loading fallback behavior

`RouteLoadingFallback` shows short, calm copy inside the phone frame:

| Context | Message |
|---------|---------|
| Default | `Loading Curavon…` |
| Ask tab | `Loading Ask…` |
| Guides tab | `Loading Guides…` |
| Profile tab | `Loading Profile…` |
| Doctor Summary | `Getting this ready…` |

- No technical terms (chunk, route, lazy boundary)
- Uses existing transparent shell styling (`.route-loading-shell`)
- `aria-busy` + `aria-live="polite"` for accessibility

---

## Build size after changes

Command: `npm run build` (with route splitting + `manualChunks`)

| Asset | Size (min) | Gzip |
|-------|------------|------|
| `index-CeGwwKyD.js` (app shell) | **196.05 kB** | 52.45 kB |
| `vendor-react-B9DRgFij.js` | 181.78 kB | 57.19 kB |
| `vendor-motion-Bq6WPVFw.js` | 125.79 kB | 41.07 kB |
| `vendor-icons-Ch18PkMQ.js` | 17.24 kB | 6.58 kB |
| `CareCircle-*.js` (lazy) | 32.69 kB | 9.35 kB |
| `AskCuravon-*.js` (lazy) | 24.28 kB | 6.91 kB |
| `Settings-*.js` (lazy) | 20.18 kB | 5.92 kB |
| `DoctorSummaryOverlay-*.js` (lazy) | 6.86 kB | 2.16 kB |
| `rolldown-runtime-*.js` | 0.82 kB | 0.47 kB |
| `index-BphSkboS.css` | 150.43 kB | 26.44 kB |

**Main app chunk:** 601.43 kB → **196.05 kB** (−67% minified, −70% gzip for app entry).

**Vite 500 kB warning:** **Resolved** — no chunk exceeds 500 kB.

**Typical first authenticated load (eager):** app + vendor-react + vendor-motion + vendor-icons ≈ **521 kB** min / **~158 kB** gzip (Ask, Guides, Settings, Doctor Summary UI deferred).

---

## Doctor Summary splitting status

- **Done:** `LazyDoctorSummaryOverlay` loads overlay + hub on first open only.
- **Kept eager:** `DoctorSummaryProvider` / context (storage, item APIs).
- **Behavior preserved:** open, save, AI/fallback summary, copy/export unchanged.

---

## Demo / test utility splitting status

- `demoData.ts` — **not imported** anywhere in runtime; no bundle impact; no change required.
- Test utilities live under `src/__tests__/` (excluded from app build).
- No debug/docs utilities found in main bundle imports.

---

## ManualChunks config

**Used** in `vite.config.ts`:

- `vendor-react` — react / react-dom / scheduler
- `vendor-motion` — framer-motion
- `vendor-icons` — lucide-react

Simple vendor split only; no custom AI or guides vendor buckets (guides content already in lazy `CareCircle` chunk).

---

## Framer Motion check

- framer-motion **not removed**; moved to `vendor-motion` chunk (cached across routes).
- Motion imports remain in components that animate; no animation rewrites.
- `MotionConfig` stays in eager `App.tsx` (small).

---

## Heavy static data (CareCircle)

- Large flow/guide definitions remain in `CareCircle.tsx`.
- Because **CareCircle is lazy-loaded**, that static content is in the `CareCircle-*.js` chunk, **not** the initial bundle.
- No content behavior changes; no extra file split (readability preserved).

---

## Regression checks (manual)

| Check | Expected | Notes |
|-------|----------|-------|
| Fresh load / auth / onboarding | Works | Onboarding + AuthFlow eager |
| Today tab | Works | Home eager |
| Ask tab | Lazy load + safety paths | Suspense fallback on first visit |
| Guides tab | Lazy load + runner + urgent terminal | Includes large static flows |
| Profile / Settings | Lazy load + export/delete | |
| Doctor Summary | Opens on demand | Chunk loads first open |
| Bottom nav / tab switch | Responsive | Single `Suspense` per tab render |
| `pendingGuideFlowId` deep link | Works | CareCircle loads when Guides tab active |

---

## Build / test / lint status

| Command | Result |
|---------|--------|
| `npm run build` | **Pass** — no 500 kB warning |
| `npm run test` | **45/45 passed** |
| `npm run lint` | **0 errors, 0 warnings** |

---

## Remaining performance carryovers

1. **DoctorSummaryContext AI module** — still in main bundle via provider; could lazy-import `generateDoctorSummaryAI` inside the generate handler only (future step).
2. **Home screen weight** — Today + check-in + health sheets remain in entry chunk; acceptable for primary route.
3. **CSS bundle** — ~150 kB single stylesheet; not split in this step.
4. **Prefetch** — optional `import()` prefetch on tab hover/focus for Ask/Guides (not implemented).
5. **CareCircle module size** — could extract `guidesContent.ts` for maintainability only; already off critical path.
