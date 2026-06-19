# Curavon AppContext Cleanup — Step 2

**Date:** 2026-06-19  
**Goal:** Reduce AppContext to UI shell state and required compatibility mirrors; clarify canonical domain ownership.

---

## Canonical Ownership

| Domain | Canonical source |
|--------|------------------|
| Auth session | `CuravonAuthProvider` / `useCuravonAuth()` |
| Health profile, check-ins, next action | `HealthContext` |
| Sensitive Mode | Health Profile via `HealthContext` |
| Next Best Action lifecycle | `HealthContext` + `nextActionAdapter` / Plan Engine v2/v3 |
| Doctor Summary | `DoctorSummaryContext` |
| Safety detection | `src/utils/healthSafety.ts` (`detectUrgentConcern`) |
| App shell (tabs, toast, overlays, onboarding flags) | `AppContext` |

---

## AppContext Responsibilities After Cleanup

**Active UI shell:**
- `activeTab` / `setActiveTab` — bottom navigation
- `theme` / `setTheme` — shell theming
- `toast` / `showToast` / `dismissToast` — global toast banner
- `showDoctorSummary` / `openDoctorSummary` / `closeDoctorSummary` — overlay
- `pendingGuideFlowId` / `openGuidesWithFlow` / `clearPendingGuideFlow` — Guides routing
- `screenBackVisible` / `setScreenBack` / `triggerScreenBack` — phone chrome back
- Onboarding/auth shell flags: `onboardingComplete`, `consentComplete`, `setupComplete`, `profileSetup`
- `completeOnboarding`, `completeAuthConsent`, `completeProfileSetup`
- `resetToOnboarding`, `clearAuthShellState`

**Compatibility mirrors (read/sync only where noted):**
- `authDemoUser` — display mirror synced from `CuravonAuthProvider`
- `sensitiveMode` / `setSensitiveMode` — UI-shell mirror synced from `HealthContext`

**Deprecated exports (no-op or alias):**
- `setAuthDemoUser` — no-op; auth writes go through provider
- `signOutDemo` — alias for `clearAuthShellState`

---

## Usage Audit Results

| Item | Decision | Notes |
|------|----------|-------|
| `activeTab` / `setActiveTab` | **A** — Keep | TabBar, App, Ask, CareCircle, PhoneChrome |
| `toast` / `showToast` | **A** — Keep | Settings, CareCircle, DoctorSummaryContext, ScreenHeader |
| `theme` / `setTheme` | **A** — Keep | TabBar, ThemeToggle, AppAuthGate |
| `authDemoUser` | **C** — Mirror | Settings display fallback; synced from provider |
| `signOutDemo` | **C** — Deprecated alias | → `clearAuthShellState` |
| `setAuthDemoUser` | **C** — Deprecated no-op | AuthFlow no longer calls it |
| `sensitiveMode` / `setSensitiveMode` | **C** — Shell mirror | HealthContext writes mirror for SensitiveBlur CSS |
| `chatMessages` / `chatStep` / `addChatMessage` | **D** — Removed | No active screen consumed legacy chat |
| `resetChat` | **D** — Removed | Settings now only calls `clearAskHistory()` |
| `CHAT_FLOWS` / `ChatMessage` | **D** — Removed | Legacy chat path deleted |
| `showSafetyEscalation` | **D** — Removed | Only set by removed chat path; AppAuthGate no longer reads it |
| `streak` / `healthPoints` | **D** — Removed | Hardcoded placeholders; no active UI (StreakCard unused) |
| `markActionDone` (AppContext) | **D** — Removed | Home uses `HealthContext.markActionDone` |
| `actionDone` / `actionAdjusted` / `adjustAction` | **D** — Removed | Unused |
| `blockedReason` / blocked sheets (AppContext) | **D** — Removed | `BottomSheets.tsx` not mounted; uses local state if imported |
| `showShareSheet` / `openShareSheet` / `closeShareSheet` | **D** — Removed | Share sheet not mounted |
| `flowView` / `setFlowView` | **D** — Removed | FullFlow deprecated, not routed |
| `smartSilence` / `toggleSmartSilence` | **D** — Removed | Smart Silence owned by Health Profile |
| `whyExpanded` / `toggleWhyExpanded` | **D** — Removed | Unused |
| `clearAllData` | **D** — Removed | No callers |
| `sendNudge` | **D** — Removed | No callers |

---

## Removed Legacy State

- `CHAT_FLOWS`, `ChatMessage`, `chatMessages`, `chatStep`, `addChatMessage`, `resetChat`
- `showSafetyEscalation`
- `streak`, `healthPoints`
- `markActionDone`, `actionDone`, `actionAdjusted`, `adjustAction`
- `blockedReason`, `showBlockedSheet`, `openBlockedSheet`, `closeBlockedSheet`, `selectBlockedReason`
- `showShareSheet`, `openShareSheet`, `closeShareSheet`
- `flowView`, `setFlowView`
- `smartSilence`, `toggleSmartSilence`
- `whyExpanded`, `toggleWhyExpanded`
- `clearAllData`, `sendNudge`

---

## Retained Compatibility State

| Field | Purpose |
|-------|---------|
| `authDemoUser` | Legacy display mirror from `CuravonAuthProvider` |
| `sensitiveMode` | Shell CSS mirror synced from Health Profile |
| `BlockedReason` type | Exported for unused `BottomSheets.tsx` |

---

## Files Changed

| File | Change |
|------|--------|
| `src/context/AppContext.tsx` | Major cleanup — shell state only |
| `src/components/AppAuthGate.tsx` | Removed `showSafetyEscalation` cloud mood |
| `src/screens/Settings.tsx` | Removed `resetChat()` from Clear Ask history |
| `src/screens/FullFlow.tsx` | Removed AppContext `blockedReason` dependency |
| `src/components/BottomSheets.tsx` | Self-contained local state; not mounted |
| `src/components/ScreenHeader.tsx` | Sensitive Mode mirror comment |

---

## Regression Checklist

| Test | Expected | Status |
|------|----------|--------|
| App loads, tabs work | No provider crash | Pass (build) |
| Auth/onboarding/setup | Reaches Today | Preserved paths unchanged |
| Today next action | From HealthContext | Home uses `useHealth().markActionDone` |
| Ask urgent safety | Terminal via `healthSafety` | No legacy chat dependency |
| Guides / Flow tab | CareCircle routing | `pendingGuideFlowId` retained |
| Sensitive Mode blur | Health Profile toggle | Mirror synced from HealthContext |
| Toasts | `showToast` works | Retained |

---

## Build Status

`npm run build` — **passed** (TypeScript + Vite, exit 0).

---

## Remaining Cleanup (Step 3+)

- Remove or archive `BottomSheets.tsx`, `FullFlow.tsx`, `StreakCard.tsx` if confirmed permanently unused
- Route `resetToOnboarding` through canonical `signOut()` to avoid auth storage drift
- Drop `authDemoUser` display mirror once all screens read `useCuravonAuth().user`
- Drop `sensitiveMode` AppContext mirror once shell reads HealthContext directly everywhere
- Move onboarding/consent/setup flags to a dedicated `OnboardingContext` or auth metadata layer
