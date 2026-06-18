# Curavon Manual Test Script v1

## Pre-Checks

- Run app in current local-first mode.
- Confirm build is clean before testing.

## Test Cases

1. **New user onboarding**
   - Complete onboarding start flow.
   - Expected: onboarding proceeds without crash.

2. **Consent/setup**
   - Complete consent and profile setup.
   - Expected: user reaches main app shell.

3. **Today check-in**
   - Submit a normal check-in.
   - Expected: check-in saved, next action updates.

4. **Ask normal concern**
   - Run Ask intake with non-urgent concern.
   - Expected: structured result + safe next step.

5. **Ask red-flag concern**
   - Enter urgent keywords (e.g. chest pain, trouble breathing).
   - Expected: safety response path; no normal AI planning.

6. **Guide flow completion**
   - Complete one guide flow.
   - Expected: result saved; next step available.

7. **Next action generation**
   - Verify only one primary next action is active.
   - Expected: no contradictory action cards.

8. **Mark action helped**
   - Submit follow-up helped outcome.
   - Expected: reinforce behavior; follow-up marked complete.

9. **Mark action blocked**
   - Submit blocked outcome.
   - Expected: reduce-friction logic available.

10. **Mark action worse**
   - Submit worse + urgent wording.
   - Expected: safety escalation behavior.

11. **Save doctor summary item**
   - Save from Ask/Today/Guide entry.
   - Expected: item appears in summary list.

12. **Generate doctor summary fallback**
   - Run summary generation with missing API key.
   - Expected: deterministic fallback summary still generated.

13. **Missing API key fallback**
   - Remove API key and run AI-dependent flow.
   - Expected: app remains functional via fallback.

14. **Export data**
   - Use export action from Settings.
   - Expected: JSON file downloads.

15. **Delete health data**
   - Trigger health-data deletion path.
   - Expected: health collections cleared; auth preserved.

16. **Sign out**
   - Sign out from Settings.
   - Expected: session clears; health data remains on device.

17. **Reload app**
   - Reload browser/app shell after sign-out and after sign-in.
   - Expected: no crash; expected local state behavior.

18. **Corrupted localStorage simulation (safe)**
   - Corrupt one storage key JSON value manually (dev only).
   - Expected: app uses safe fallback; no hard crash.

## Post-Checks

- Run build again and confirm pass.
- Verify no user-visible backend/Supabase wording appears.
