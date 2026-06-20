# Step 15 — CSS Architecture Refactor Phase 1 Audit

Date: 2026-06-18  
Scope: Split `App.css` into `src/styles/` without visual redesign.

---

## 1. Current App.css size / structure (before)

| Metric | Value |
|--------|-------|
| **Lines** | 9,351 |
| **Import** | `App.tsx` → `./App.css` |
| **Structure** | Single monolithic file: tokens, reset, phone shell, clouds/themes, components, all screens |

Major groups identified:

- Design tokens / `:root` variables (lines ~45–167)
- Global reset / base (`html`, `body`, box-sizing)
- App shell / phone frame / scaler / status bar / tab bar
- Soft medical sky / cloud layers / per-tab mood / theme skies / night mode
- Design system (glass cards, typography, buttons, pills, theme toggle)
- Shared UI (native switch, bottom sheet, toast, sensitive blur)
- Screen sections: onboarding, auth, home/today, ask, guides/care circle, settings, doctor summary, full flow, activity insights
- Premium tab polish blocks (today, guides, profile, ask overrides)

---

## 2. New CSS folder structure

```
src/styles/
  index.css              ← entry point (imported from App.tsx)
  tokens.css
  base.css
  layout.css
  components.css
  overlays.css
  screens/
    auth.css
    doctor-summary.css
    full-flow.css
    activity-insights.css
src/App.css              ← legacy holding file (unmigrated styles)
```

**Not created in Phase 1** (deferred): `home.css`, `ask.css`, `guides.css`, `settings.css` — large/interleaved sections remain in `App.css`.

---

## 3. Files created / changed

**Created**

- `docs/audits/css-architecture-phase-1-step-15.md`
- `scripts/migrate-css-phase1.mjs`
- `src/styles/index.css`
- `src/styles/tokens.css`
- `src/styles/base.css`
- `src/styles/layout.css`
- `src/styles/components.css`
- `src/styles/overlays.css`
- `src/styles/screens/auth.css`
- `src/styles/screens/doctor-summary.css`
- `src/styles/screens/full-flow.css`
- `src/styles/screens/activity-insights.css`

**Changed**

- `src/App.css` — legacy header; migrated sections removed
- `src/App.tsx` — imports `./styles/index.css` instead of `./App.css`
- `src/main.tsx` — removed duplicate `./index.css` import (body reset lives in `base.css`)

---

## 4. Styles moved out of App.css

| File | Content moved |
|------|----------------|
| `tokens.css` | `:root` custom properties (fonts, colors, glass, phone dims, typography tokens) |
| `base.css` | Font import, box-sizing reset, `html/body/#root`, body font smoothing |
| `layout.css` | `.app-root`, phone scaler/device/frame chrome, screen wrapper, route loading, safe area, `.screen`, header, tab bar |
| `components.css` | Glass cards, typography hierarchy, button system, progress pills, native switch |
| `overlays.css` | Generic overlay backdrop, bottom sheet, doctor summary overlay shell |
| `screens/auth.css` | Onboarding + auth shell/forms/trust cards |
| `screens/doctor-summary.css` | Doctor summary overlay content, hub, item cards, built preview |
| `screens/full-flow.css` | Full Flow screen timeline + Full Flow overlay panel |
| `screens/activity-insights.css` | Activity Insights cards in Settings |

**Approx. lines migrated:** ~3,408 (9,351 → 5,943 in `App.css`)

---

## 5. Styles intentionally left in App.css

- Cloud / sky background layers and animations
- Per-tab mood tuning (home, ask, guides, profile, safety)
- Theme skies (mist/dawn/sky) and extensive night-mode overrides
- Theme toggle panel styles
- Home / Today tab styles
- Ask Curavon intake/result/landing (large block)
- Guides / CareCircle (largest remaining screen group)
- Settings (except Activity Insights — moved)
- Health profile / check-in editor
- Accordion, streak, progress cards
- Chat, safety screens
- Care Circle member cards
- Premium tab polish (today, guides, profile, ask readability overrides)
- Phone-scoped UI utilities
- Reduced-motion blocks tied to cloud animations

---

## 6. Import order

`src/styles/index.css`:

1. `tokens.css`
2. `base.css`
3. `layout.css`
4. `components.css`
5. `overlays.css`
6. Screen files (auth → doctor-summary → full-flow → activity-insights)
7. `../App.css` (legacy unmigrated)

Entry: `App.tsx` → `./styles/index.css`

**Cascade preserved:** migrated selectors removed from `App.css` to avoid duplicate definitions. Legacy file loads last for remaining rules only.

---

## 7. Theme compatibility

- `src/theme/themes.ts` + `themeStyles.ts` inject runtime CSS variables via JS — unchanged
- `:root` token names unchanged — no renames
- `getThemeCssVars` / theme class modifiers on `.phone-frame` remain in legacy `App.css`

---

## 8. CSS ownership rules (going forward)

- New **screen-specific** styles → `src/styles/screens/<screen>.css`
- New **shared components** (buttons, cards, toggles) → `components.css`
- New **overlays/modals** → `overlays.css`
- New **tokens** → `tokens.css`
- **Avoid** adding new styles to `App.css`
- Prefer specific class names; use Curavon prefixes for new patterns when generic names risk collision

---

## 9. Visual regression checks

Code-verified (no visual redesign; build produces same bundle size ~152.6 kB CSS):

| Area | Expected | Status |
|------|----------|--------|
| Auth/onboarding | Same cards, spacing, Flo polish | Migrated intact to `auth.css` |
| Today | Background, hero card, bottom nav | Shell in `layout.css`; home styles in legacy |
| Ask | Wizard/card layout | Legacy `App.css` |
| Guides | Browse/runner/result | Legacy `App.css` |
| Settings/Profile | Sections, toggles | Legacy + `activity-insights.css` |
| Doctor Summary | Overlay opens, cards unchanged | `overlays.css` + `doctor-summary.css` |
| Full Flow overlay | Overlay layout unchanged | `full-flow.css` |
| Activity Insights | Cards unchanged | `activity-insights.css` |
| Mobile viewport | No horizontal scroll; fixed tab bar | `layout.css` |
| Theme / reduced motion | No regression | Night/theme blocks remain in legacy |

---

## 10. Line counts (after Phase 1)

| File | Lines |
|------|------:|
| `App.css` (legacy) | 5,943 |
| `tokens.css` | 126 |
| `base.css` | 30 |
| `layout.css` | 191 |
| `components.css` | 791 |
| `overlays.css` | 158 |
| `screens/auth.css` | 1,299 |
| `screens/doctor-summary.css` | 283 |
| `screens/full-flow.css` | 218 |
| `screens/activity-insights.css` | 60 |
| `index.css` | 15 |

---

## 11. Build status

| Command | Status |
|---------|--------|
| `npm run build` | **Pass** (CSS bundle ~152.57 kB gzip 27.23 kB) |
| `npm run test` | **80/80 passed** |
| `npm run lint` | **Pass** |

---

## 12. Remaining CSS refactor carryovers (Phase 2+)

- Extract `screens/home.css` (Today/hero/check-in — ~800+ lines)
- Extract `screens/ask.css` (intake/result/landing — ~900+ lines)
- Extract `screens/guides.css` (CareCircle — ~1,200+ lines, highest conflict risk)
- Extract `screens/settings.css` (profile sections, smart silence, data controls)
- Move cloud/theme/night blocks into `tokens.css` + `themes.css` or `layout.css` submodules
- Move bottom sheet / toast / sensitive blur into `components.css` or `overlays.css`
- Delete `src/index.css` (orphaned; body reset now in `base.css`)
- Remove `App.css` entirely once empty enough
- Optional: CSS modules or scoped conventions per screen (not in scope)
