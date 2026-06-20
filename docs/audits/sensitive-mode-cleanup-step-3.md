# Curavon Sensitive Mode Cleanup — Step 3

**Date:** 2026-06-19  
**Goal:** Single canonical Sensitive Mode source — Health Profile via `HealthContext`.

---

## Canonical Source

| Item | Owner |
|------|--------|
| Read | `healthProfile.sensitiveMode` from `useHealth()` |
| Write | `updateHealthProfile({ sensitiveMode })` in `HealthContext` |
| Persistence | `APP_STORAGE_KEYS.healthProfile` (localStorage) |

Sensitive Mode is a **health-profile privacy preference**, not an AppContext shell preference.

---

## Usage Audit

| Location | Type | Action |
|----------|------|--------|
| `HealthContext.updateHealthProfile` | Canonical write | Retained — sole writer |
| `HealthContext.clearHealthData` | Canonical reset | Resets via `createDefaultHealthProfile()` (`sensitiveMode: false`) |
| `Settings.tsx` toggle | Canonical write | `updateHealthProfile({ sensitiveMode: !... })` — unchanged |
| `AuthFlow.tsx` setup toggle | Initial profile write | Local form state → `completeProfileSetup` → health profile storage |
| `Home.tsx` | Canonical read | `healthProfile.sensitiveMode` |
| `AskCuravon.tsx` | Canonical read | `healthProfile.sensitiveMode` |
| `AppAuthGate.tsx` shell CSS | Canonical read | `healthProfile.sensitiveMode` → `sensitive-mode-active` class |
| `SensitiveBlur` | Canonical read | `healthProfile.sensitiveMode` only |
| `HealthListEditor` | Prop-driven hide | `hideSensitiveValues={healthProfile.sensitiveMode}` from Settings |
| `AppContext.sensitiveMode` | Legacy mirror | **Removed** |
| `AppContext.setSensitiveMode` | Unsafe mirror write | **Removed** |
| `HealthContext → AppContext sync` | Mirror write | **Removed** |
| `OnboardingData.sensitiveMode` | Onboarding capture only | Retained in onboarding form data (not runtime preference) |
| `ProfileSetupData.sensitiveMode` | Setup → health profile seed | Retained — written to health profile on setup |

---

## Removed Legacy Mirrors

- `AppState.sensitiveMode`
- `AppContextValue.setSensitiveMode`
- `completeOnboarding` / `completeProfileSetup` AppContext mirror writes
- `HealthContext` `useEffect` syncing to AppContext
- `HealthContext.updateHealthProfile` AppContext mirror calls
- `HealthContext.clearHealthData` `setSensitiveMode(false)` call
- `SensitiveBlur` fallback to AppContext mirror

---

## Sign-Out / Delete Behavior

| Action | Sensitive Mode |
|--------|----------------|
| Sign out | Health profile preserved → preference persists |
| Delete all health data | Profile reset to default (`sensitiveMode: false`) |
| Reset demo shell | Does not clear health profile |

---

## Files Changed

| File | Change |
|------|--------|
| `src/context/AppContext.tsx` | Removed `sensitiveMode` state and `setSensitiveMode` |
| `src/context/HealthContext.tsx` | Removed AppContext dependency for Sensitive Mode |
| `src/components/ScreenHeader.tsx` | `SensitiveBlur` reads Health Profile only |

---

## Regression Checklist

| Test | Expected | Status |
|------|----------|--------|
| Settings toggle | Persists after reload | Pass (canonical path unchanged) |
| Home/Today blur | Hides sensitive content | Pass (`SensitiveBlur` + HealthContext) |
| Ask history blur | Hides when mode on | Pass (`healthProfile.sensitiveMode`) |
| Health list fields | Hide/reveal in Settings | Pass (`HealthListEditor` prop) |
| Sign out | Preference remains | Pass (health data untouched) |
| Delete health data | Resets to default off | Pass (`createDefaultHealthProfile`) |
| App shell CSS class | `sensitive-mode-active` | Pass (`AppAuthGate` reads HealthContext) |

---

## Build Status

`npm run build` — **passed** (TypeScript + Vite, exit 0).

---

## Remaining Carryovers

- `OnboardingData.sensitiveMode` — onboarding form field only; not used for runtime blur until profile setup writes health profile
- `AuthFlow` local `useState` for setup-time Sensitive Mode choice — seeds health profile via `completeProfileSetup`, not AppContext
- `ProfileSetupData.sensitiveMode` — setup metadata mirrored in `profileSetup` storage key (display/history, not runtime blur source)
