# CSS organization

Curavon styles are migrating from the legacy `src/App.css` monolith into `src/styles/` without visual redesign. Class names and computed output must stay the same during extraction.

## Target structure

| Layer | Path | Purpose |
| --- | --- | --- |
| Entry | `app/globals.css` → `src/styles/index.css` | Single import chain for the app |
| Tokens / base | `src/styles/tokens.css`, `base.css` | Variables, resets, typography defaults |
| Layout | `src/styles/layout.css` | Phone frame, screen shell, tab bar |
| Components | `src/styles/components.css`, `overlays.css` | Shared UI primitives (buttons, cards, sheets) |
| Screens | `src/styles/screens/*.css` | Screen-scoped styles (auth, settings, doctor summary, …) |
| Utilities | (future) `src/styles/utilities.css` | Small helpers only when repeated |

## Current state (Phase 2)

- **Migrated:** tokens, base, layout, components, overlays, auth, doctor-summary, full-flow, activity-insights, **settings** (account grid, data notes, smart silence prefs).
- **Legacy:** `src/App.css` still holds most screen styles and night-mode overrides.
- **Do not add** new rules to `App.css` unless unavoidable; prefer the matching layer above.

## Extraction rules

1. Preserve class names exactly.
2. Move one bounded section per change (screen or component family).
3. Import new files in `src/styles/index.css` **before** the legacy `@import '../App.css'`.
4. Remove duplicated blocks from `App.css` (and from misplaced files like `auth.css` when moved).
5. No Tailwind or CSS modules in this migration track.

## TODO — future extraction order

1. ~~CSS variables / tokens~~ (done → `tokens.css`)
2. ~~Settings screen~~ (done → `screens/settings.css`)
3. Button primitives (`.btn`, `.btn-primary`, glass variants) → `components.css`
4. Home screen hero / greeting → `screens/home.css`
5. Ask Curavon intake / results → `screens/ask.css`
6. Guides flows → `screens/guides.css`
7. Night mode overrides (`.phone-frame--night`) → `themes/night.css` or split by layer
8. Remove `src/App.css` import once empty

## Verification

After each extraction: `npm run build` and spot-check affected screens in the phone frame. Automated visual regression is not yet in CI for CSS moves.
