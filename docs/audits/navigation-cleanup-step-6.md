# Curavon Navigation Cleanup — Step 6

**Date:** 2026-06-19  
**Goal:** One user-facing Guides destination; remove duplicate Flow/Guides tab navigation.

---

## Old Navigation Structure

### Bottom tab bar (5 tabs)

| Tab key | Label | Screen |
|---------|-------|--------|
| `home` | Today | HomeScreen |
| `ask` | Ask | AskCuravonScreen |
| `flow` | **Flow** | CareCircleScreen |
| `circle` | **Guides** | CareCircleScreen |
| `settings` | Profile | SettingsScreen |

### App.tsx routes

Both `flow` and `circle` mapped to `CareCircleScreen` — duplicate paths to the same experience.

### Internal navigation

- `openGuidesWithFlow` → `setActiveTab('circle')` ✓
- Home related guide → `setActiveTab('circle')` ✓
- Ask browse guides → `setActiveTab('circle')` ✓
- No active `setActiveTab('flow')` callers found

### FullFlow.tsx

Deprecated placeholder; not imported in App.tsx or navigation.

---

## Chosen Final Navigation

### Bottom tab bar (4 tabs)

| Tab key | User label | Screen |
|---------|------------|--------|
| `home` | Today | HomeScreen |
| `ask` | Ask | AskCuravonScreen |
| `circle` | **Guides** | CareCircleScreen |
| `settings` | Profile | SettingsScreen |

**Canonical Guides key:** `circle` (internal; user sees "Guides")

**Legacy alias:** `flow` → normalized to `circle` on `setActiveTab` and `MainAppTabs` mount

---

## Route Compatibility

- `MAIN_TAB_SCREENS.flow` retained as hidden compatibility alias → `CareCircleScreen`
- `setActiveTab('flow')` normalizes to `circle`
- `MainAppTabs` resolves `flow` → `circle` for render
- TabBar highlights Guides when `activeTab` is `circle` or legacy `flow`

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/TabBar.tsx` | Removed Flow tab; 4-tab nav |
| `src/App.tsx` | Legacy flow comment + tab normalization |
| `src/context/AppContext.tsx` | `setActiveTab` normalizes `flow` → `circle` |
| `src/components/CloudBackground.tsx` | Legacy `flow` mood maps to `learn` |
| `src/screens/FullFlow.tsx` | Stronger deprecation comment |

---

## Regression Checklist

| Test | Expected |
|------|----------|
| Bottom nav | Today, Ask, Guides, Profile only |
| Tap Guides | CareCircleScreen opens |
| Guided flow runner | Unchanged in CareCircleScreen |
| Ask → related guide | `openGuidesWithFlow` / `circle` tab |
| Today → guide | `setActiveTab('circle')` |
| Safety terminal | Return to Guides (in-screen browse) |
| FullFlow | Not in navigation |
| Build | Pass |

---

## Build Status

`npm run build` — **passed** (TypeScript + Vite, exit 0).

---

## Remaining Carryovers

- Internal `TabId` still includes deprecated `'flow'` for compatibility
- CareCircleScreen file/component name unchanged (not user-facing)
- In-Guides filter chip label "Flows" remains (content category, not nav tab)
- CSS classes like `flow-screen`, `guides-flow-card` unchanged (styling only)
