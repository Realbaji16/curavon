# Curavon Known Limitations v1

For testers, demo audiences, and launch readiness review.

---

## Platform & Data

- **Local-first:** Health data in this version is stored on the device only.
- **No cross-device sync:** Data does not follow you to another phone or browser.
- **No production backend:** No Supabase, cloud database, or remote account recovery in this build.
- **Demo auth:** Local demo sign-in/up; passwords stored for prototype use only.

## Medical Scope

- Curavon **does not diagnose**, **prescribe**, **treat**, **prevent**, or **cure** conditions.
- Curavon is **not for emergencies**. Call local emergency services for urgent danger.
- **No clinical validation** has been completed for outcomes or accuracy.
- Doctor Summary organizes **your notes** — it is not a medical conclusion.

## AI

- AI is **guarded** and may **fallback** to rule-based responses without an API key.
- AI does **not** run on urgent safety paths, auth, export, or delete flows.
- AI cannot invent actions outside safe candidate lists in the plan engine.
- AI behavior may vary; outputs should be treated as organizational support only.

## Product Gaps (Known)

- Consent versioning not implemented
- Bundle size not optimized for low-end devices
- Flow and Guides tabs both open the same Guides experience
- Legacy chat/demo code paths remain in codebase (inactive in primary flows)
- Legal/privacy documents are **placeholders only**
- Forgot-password flow not implemented
- Production auth (OAuth, email verify, etc.) not implemented

## What Works Well for Testing

- Today check-in and one next best action
- Ask Curavon guided intake (normal + urgent safety)
- Guided flows and learning cards
- Follow-up outcomes
- Doctor Summary save and generation (with fallback)
- Export, delete health data, sign out
