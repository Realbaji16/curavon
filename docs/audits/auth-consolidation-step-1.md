# Curavon Auth Consolidation — Step 1

**Date:** 2026-06-19  
**Goal:** Make `CuravonAuthProvider` the single canonical auth source; remove independent auth writes from `AppContext`.

---

## Where Auth Session Is Created

| Path | Location | Storage keys |
|------|----------|--------------|
| Sign up | `localAuthAdapter.signUpWithEmail` via `useCuravonAuth().signUp` | `authDemoUser`, `authDemoUserId`, `authDemoUsers` |
| Sign in | `localAuthAdapter.signInWithEmail` via `useCuravonAuth().signIn` | Same |
| Legacy (removed) | ~~`AppContext.setAuthDemoUser`~~ | Was duplicate write — removed |

---

## Where Auth Session Is Read

| Consumer | Source (after Step 1) |
|----------|------------------------|
| App shell gating | `AppAuthGate` → `useCuravonAuth().isAuthenticated` |
| Auth flow | `useCuravonAuth().user` + AppContext setup flags |
| Settings profile | `useCuravonAuth().session.user` |
| AppContext mirror | `authDemoUser` synced from provider via `useEffect` (display only) |
| Health export/delete | `APP_STORAGE_KEYS.authDemoUserId` |

---

## Where Sign Out Happens

| Location | Behavior (after Step 1) |
|----------|-------------------------|
| Settings → Sign out | `useCuravonAuth().signOut()` + `clearAuthShellState()` |
| `localAuthAdapter.signOut` | Clears `authDemoUser`, `authDemoUserId` |
| `AppContext.clearAuthShellState` | Clears consent/setup **UI flags** only (not auth credentials) |
| ~~`signOutDemo`~~ | Deprecated alias → `clearAuthShellState` |

Sign out does **not** delete health data.

---

## Consent / Setup Flags

| Flag | Storage key | Written by |
|------|-------------|------------|
| Consent complete | `consentComplete` | `AppContext.completeAuthConsent` |
| Setup complete | `setupComplete` | `AppContext.completeProfileSetup` |
| Profile setup | `profileSetup` | `AppContext.completeProfileSetup` |
| Onboarding seen | `onboardingSeen` | `AppContext.completeOnboarding` |

Auth adapter reads consent/setup into `CuravonUser.consentCompleted` / `setupCompleted` for session metadata. App shell gates on `setupComplete` (AppContext) + `isAuthenticated` (provider).

---

## App Shell Gating (`App.tsx`)

```
CuravonAuthProvider
  → AppProvider
    → HealthProvider
      → AppAuthGate
           ├─ authLoading → loading shell
           ├─ !onboardingComplete → Onboarding
           ├─ !isAuthenticated || !setupComplete → AuthFlow
           └─ main app tabs
```

---

## Settings Account Actions

| Action | Auth | Health data |
|--------|------|-------------|
| Sign out | `signOut()` + `clearAuthShellState()` | Preserved |
| Delete local account | `deleteLocalAccount()` + `clearAuthShellState()` | Preserved (unless user chooses delete all) |
| Delete account + health data | `deleteLocalAccount()` + health clear | Removed |
| Delete all health data | `clearHealthData()` only | Removed; session preserved |

---

## Local Demo Password Warning

`localAuthAdapter.ts` documents: passwords stored in plaintext for local demo only — not production-secure. Replace with backend auth before public launch.

---

## Regression Checklist

| Test | Expected |
|------|----------|
| Fresh user sign-up | Auth → consent → profile → Today |
| Reload with session | Stays signed in, Today loads |
| Sign out | Auth shell; health data remains |
| Delete health data | Data gone; session remains |
| Corrupt auth storage | No crash; auth shell |
