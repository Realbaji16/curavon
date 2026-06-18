# Curavon Product Flow Audit v1

Audit date: 2026-06-18  
Method: file inspection of runtime paths (no assumptions)

## Flow Map

| Step | Status | Primary files | Notes |
|------|--------|---------------|-------|
| 1. First app open | **works** | `src/App.tsx`, `src/screens/Onboarding.tsx` | Onboarding shown when `onboardingComplete` false. |
| 2. Auth/onboarding | **works** | `src/App.tsx`, `src/screens/AuthFlow.tsx` | After onboarding, auth flow if no demo user or setup incomplete. |
| 3. Consent | **works** | `src/screens/AuthFlow.tsx`, `src/context/AppContext.tsx` | Consent stage + `completeAuthConsent` persists flag. |
| 4. Setup/profile | **works** | `src/screens/AuthFlow.tsx`, `src/context/AppContext.tsx` | Profile setup writes health profile + setupComplete. |
| 5. Today home | **works** | `src/screens/Home.tsx`, `src/context/HealthContext.tsx` | Greeting, pattern card, hero action, follow-up card. |
| 6. Check-in | **works** | `src/components/TodayCheckIn.tsx`, `src/context/HealthContext.tsx` | Multi-step check-in; urgent detection on text fields. |
| 7. Ask normal concern | **works** | `src/screens/AskCuravon.tsx` | Intake → orchestrator → plan → result; follow-up created. |
| 8. Ask red-flag concern | **partially works** | `src/screens/AskCuravon.tsx` | Safety screen shown; user can continue to result after acknowledge. |
| 9. Guide flow start | **works** | `src/screens/CareCircle.tsx` | Browse → detail → runner; pendingGuideFlowId deep link works. |
| 10. Guide flow result | **works** | `src/screens/CareCircle.tsx` | Auto-saves to doctor summary on result view; plan action generated. |
| 11. Next Best Action generation | **partially works** | `src/context/HealthContext.tsx`, `src/lib/plan/planEngineV2.ts`, `src/utils/orchestratorV2.ts`, `src/screens/Home.tsx` | Multiple engines; Home displays both stored state and orchestrator preview. |
| 12. Follow-up creation | **partially works** | `src/lib/followUp/followUpStorage.ts`, Ask/Guides/HealthContext | Created from multiple entry points; dedupe by actionId+day. |
| 13. Follow-up completion | **works** | `src/screens/Home.tsx`, `src/context/HealthContext.tsx` | Outcome buttons; escalation on worse+urgent note. |
| 14. Doctor Summary save | **works** | `src/context/DoctorSummaryContext.tsx`, Ask/Guides/Today paths | Manual save + auto from check-in/action/red-flag. |
| 15. Doctor Summary generation | **works** | `src/components/DoctorSummaryHub.tsx`, `src/lib/doctorSummary/doctorSummaryAI.ts` | Explicit button only; fallback without API key. |
| 16. Data export | **works** | `src/screens/Settings.tsx`, `src/lib/data/dataExport.ts` | Export + backup download available. |
| 17. Delete health data | **works** | `src/screens/Settings.tsx`, `src/lib/data/dataDeletion.ts` | Confirm-tap pattern; clears core keys + summary. |
| 18. Sign out | **works** | `src/screens/Settings.tsx`, `src/context/AppContext.tsx`, `src/lib/auth/localAuthAdapter.ts` | Clears session keys; health data preserved on device. |
| 19. Reload app | **works** | `src/context/AppContext.tsx`, storage helpers | State rehydrates from localStorage; safeRead fallbacks. |

## Navigation / Shell Notes

- **Tab bar:** Today, Ask, Flow, Guides, Profile (`src/components/TabBar.tsx`).
- **Flow tab:** points to static `FullFlowScreen` placeholder — **not connected** to Guides flow runners.
- **Guides tab:** actual guided flows + learning cards live here (`CareCircleScreen`).
- **Doctor Summary:** overlay accessible from multiple tabs via `DoctorSummaryOverlay`.

## UI / State Flow Audit (Part 10)

| Check | Status | Evidence |
|-------|--------|----------|
| Today not cluttered | **partially works** | Pattern card + follow-up + hero + insights; functional but dense. |
| Ask flow not confusing | **mostly works** | Landing → intake → result/safety; non-scroll landing enforced. |
| Guides flow in-tab | **works** | Full runner in CareCircle without leaving app. |
| Doctor Summary accessible | **works** | Overlay + Settings shortcut. |
| Profile/settings data controls clear | **works** | Export, backup, restore, delete, sign-out labeled. |
| Loading states where needed | **partially works** | AI summary loading state; plan/check-in async lacks global spinners. |
| Empty states safe | **works** | Empty snapshot, no check-in prompt, empty summary fallbacks. |
| No developer debug text visible | **mostly works** | No "Data mode: local-first" in Settings; "Prototype account" still shown in AuthFlow. |
| No Supabase/backend wording | **works** | Only placeholder comment in sync backend file. |
| Local-only storage wording clear | **partially works** | Settings says "stored on this device"; auth says "synced to you" (misleading for local demo). |

## Product Flow Summary

Core user journeys **work end-to-end** for local demo use. Main friction points: **dual Flow tab vs Guides**, **multiple next-action sources on Today**, and **Ask/Guides post-urgent continuation to result**.
