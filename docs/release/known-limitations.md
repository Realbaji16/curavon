# Known limitations — private pilot

Plain-language limits for **pilot users and reviewers**. Curavon is an organizational support tool, not clinical care.

---

## What Curavon is

- A private tool to **organize** health notes, check-ins, and one safer next step
- A way to **prepare** for conversations with clinicians (Doctor Summary)
- A **guided** Ask and Guides experience with safety guardrails

---

## What Curavon is not

| Limitation | Detail |
|------------|--------|
| **Not a diagnosis tool** | Curavon does not diagnose conditions or interpret tests as clinical conclusions. |
| **Not for emergencies** | If you may be in immediate danger, contact **local emergency services** or a crisis line now. Curavon is not an emergency service. |
| **Not medication management** | Curavon does not prescribe, change doses, or tell you to start/stop medications. |
| **Not a substitute for clinician review** | Doctor Summary organizes **your** notes — it is not medical advice or a clinical record. |
| **Not a replacement for professional care** | Always follow your clinician’s guidance for medical decisions. |

---

## Pilot-specific limitations

| Area | Limitation |
|------|------------|
| **AI** | AI may be **disabled** or **deterministic** during pilot (`AI_ENABLED=false`). When enabled, outputs are guarded but may still require your judgment. |
| **Care Circle** | Health-detail sharing with Care Circle is **not enabled by default**. Members do not receive raw flows, summaries, or ask history unless explicit permission is added in a future release. |
| **Account deletion** | Full account deletion may be **request-based**; processing is not always immediate. Export may also be request-based. |
| **Pilot size** | Invite-only; features may change without notice during pilot. |
| **Legal documents** | Privacy policy and terms are **drafts** pending counsel review (`docs/launch/safety-and-privacy-placeholder-v1.md`). |
| **Monitoring** | Product analytics are metadata-only; no guarantee of 24/7 human monitoring. |
| **Availability** | Pilot may pause for safety updates without advance notice (see rollback plan). |

---

## Data (pilot build)

- Health data for pilot users is stored in **Supabase** tied to your account (not localStorage).
- **Sensitive Mode** marks flows as sensitive and uses discreet labels in compact views.
- You can request **export** or **deletion** from Settings; scoped deletes remove specific flows or summaries.

---

## Safety behavior you should know

- **Urgent language** (e.g. chest pain, self-harm) triggers safety guidance — Curavon will **not** offer a normal self-care plan on that path.
- Red-flag detection runs in the app and is **re-checked on the server** for AI routes.
- If something feels wrong or unsafe in the product, stop using the feature and contact the pilot feedback channel.

---

## Questions or concerns

Use the pilot feedback channel defined in **`private-pilot-runbook.md`**.  
For safety emergencies, use local emergency services — not Curavon support.
